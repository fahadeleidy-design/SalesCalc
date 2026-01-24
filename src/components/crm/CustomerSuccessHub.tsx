import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Heart,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle,
    Clock,
    Calendar,
    DollarSign,
    Users,
    Activity,
    RefreshCw,
    Search,
    Eye,
    X,
    Zap,
    Target,
    Mail,
    Phone,
    BarChart3,
    Bell,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../lib/currencyUtils';

interface CustomerHealth {
    id: string;
    customer_id: string;
    customer_name: string;
    contact_email: string;
    health_score: number;
    engagement_score: number;
    adoption_score: number;
    satisfaction_score: number;
    churn_risk: 'low' | 'medium' | 'high';
    last_activity_date: string | null;
    renewal_date: string | null;
    contract_value: number;
    days_since_contact: number;
    open_tickets: number;
    notes?: string;
}

interface RenewalItem {
    id: string;
    customer_name: string;
    contract_value: number;
    renewal_date: string;
    health_score: number;
    churn_risk: 'low' | 'medium' | 'high';
}

interface UpsellOpportunity {
    id: string;
    customer_name: string;
    opportunity: string;
    potential_value: number;
    likelihood: 'high' | 'medium' | 'low';
    reason: string;
}

// Mock data for demonstration
const mockCustomerHealth: CustomerHealth[] = [
    {
        id: '1',
        customer_id: 'cust-1',
        customer_name: 'Acme Corporation',
        contact_email: 'contact@acme.com',
        health_score: 85,
        engagement_score: 90,
        adoption_score: 80,
        satisfaction_score: 85,
        churn_risk: 'low',
        last_activity_date: '2025-01-20',
        renewal_date: '2025-06-15',
        contract_value: 120000,
        days_since_contact: 4,
        open_tickets: 0,
    },
    {
        id: '2',
        customer_id: 'cust-2',
        customer_name: 'TechStart Inc',
        contact_email: 'hello@techstart.io',
        health_score: 45,
        engagement_score: 35,
        adoption_score: 50,
        satisfaction_score: 50,
        churn_risk: 'high',
        last_activity_date: '2025-01-02',
        renewal_date: '2025-03-01',
        contract_value: 48000,
        days_since_contact: 22,
        open_tickets: 3,
        notes: 'Multiple support escalations. Low product usage.',
    },
    {
        id: '3',
        customer_id: 'cust-3',
        customer_name: 'Global Trading Co',
        contact_email: 'sales@globaltrading.sa',
        health_score: 72,
        engagement_score: 75,
        adoption_score: 70,
        satisfaction_score: 70,
        churn_risk: 'medium',
        last_activity_date: '2025-01-15',
        renewal_date: '2025-04-20',
        contract_value: 85000,
        days_since_contact: 9,
        open_tickets: 1,
    },
    {
        id: '4',
        customer_id: 'cust-4',
        customer_name: 'Innovation Labs',
        contact_email: 'team@innovationlabs.com',
        health_score: 92,
        engagement_score: 95,
        adoption_score: 90,
        satisfaction_score: 92,
        churn_risk: 'low',
        last_activity_date: '2025-01-23',
        renewal_date: '2025-09-10',
        contract_value: 200000,
        days_since_contact: 1,
        open_tickets: 0,
    },
    {
        id: '5',
        customer_id: 'cust-5',
        customer_name: 'Retail Plus',
        contact_email: 'info@retailplus.sa',
        health_score: 58,
        engagement_score: 60,
        adoption_score: 55,
        satisfaction_score: 60,
        churn_risk: 'medium',
        last_activity_date: '2025-01-10',
        renewal_date: '2025-05-05',
        contract_value: 65000,
        days_since_contact: 14,
        open_tickets: 2,
        notes: 'Requested training session for new team members.',
    },
];

const mockUpsellOpportunities: UpsellOpportunity[] = [
    {
        id: '1',
        customer_name: 'Acme Corporation',
        opportunity: 'Enterprise Analytics Add-on',
        potential_value: 25000,
        likelihood: 'high',
        reason: 'High engagement with reporting features',
    },
    {
        id: '2',
        customer_name: 'Innovation Labs',
        opportunity: 'Additional User Licenses (10)',
        potential_value: 18000,
        likelihood: 'high',
        reason: 'Team expansion mentioned in last call',
    },
    {
        id: '3',
        customer_name: 'Global Trading Co',
        opportunity: 'Integration Package',
        potential_value: 12000,
        likelihood: 'medium',
        reason: 'Inquired about ERP integration',
    },
];

export default function CustomerSuccessHub() {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRisk, setFilterRisk] = useState<string>('all');
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerHealth | null>(null);
    const [activeTab, setActiveTab] = useState<'health' | 'renewals' | 'upsell' | 'alerts'>('health');

    const customers = mockCustomerHealth;
    const upsells = mockUpsellOpportunities;

    const filteredCustomers = customers.filter((c) => {
        const matchesSearch =
            c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.contact_email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRisk = filterRisk === 'all' || c.churn_risk === filterRisk;
        return matchesSearch && matchesRisk;
    });

    // Calculate stats
    const avgHealthScore = Math.round(customers.reduce((sum, c) => sum + c.health_score, 0) / customers.length);
    const atRiskCustomers = customers.filter((c) => c.churn_risk === 'high').length;
    const upcomingRenewals = customers.filter((c) => {
        if (!c.renewal_date) return false;
        const renewalDate = new Date(c.renewal_date);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        return renewalDate <= thirtyDaysFromNow;
    }).length;
    const totalARR = customers.reduce((sum, c) => sum + c.contract_value, 0);

    const getHealthColor = (score: number) => {
        if (score >= 75) return 'text-green-600';
        if (score >= 50) return 'text-amber-600';
        return 'text-red-600';
    };

    const getHealthBg = (score: number) => {
        if (score >= 75) return 'bg-green-500';
        if (score >= 50) return 'bg-amber-500';
        return 'bg-red-500';
    };

    const riskColors: Record<string, string> = {
        low: 'bg-green-100 text-green-700',
        medium: 'bg-amber-100 text-amber-700',
        high: 'bg-red-100 text-red-700',
    };

    const riskIcons: Record<string, React.ReactNode> = {
        low: <CheckCircle className="h-4 w-4 text-green-500" />,
        medium: <AlertTriangle className="h-4 w-4 text-amber-500" />,
        high: <AlertTriangle className="h-4 w-4 text-red-500" />,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Heart className="h-7 w-7 text-orange-500" />
                        Customer Success Hub
                    </h2>
                    <p className="text-slate-600 mt-1">Monitor customer health and prevent churn</p>
                </div>
                <button
                    onClick={() => toast.success('Health scores refreshed!')}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh Scores
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Avg Health Score</p>
                            <p className={`text-2xl font-bold mt-1 ${getHealthColor(avgHealthScore)}`}>
                                {avgHealthScore}
                            </p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <Activity className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                    <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${getHealthBg(avgHealthScore)}`} style={{ width: `${avgHealthScore}%` }} />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">At-Risk Customers</p>
                            <p className="text-2xl font-bold text-red-600 mt-1">{atRiskCustomers}</p>
                        </div>
                        <div className="p-3 bg-red-100 rounded-lg">
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Requires immediate attention</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Renewals (30 days)</p>
                            <p className="text-2xl font-bold text-amber-600 mt-1">{upcomingRenewals}</p>
                        </div>
                        <div className="p-3 bg-amber-100 rounded-lg">
                            <Calendar className="h-6 w-6 text-amber-600" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Upcoming contract renewals</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Total ARR</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalARR)}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <DollarSign className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> +8% YoY
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="border-b border-slate-200">
                    <nav className="flex gap-6 px-6">
                        {[
                            { id: 'health', label: 'Health Scores', icon: Activity },
                            { id: 'renewals', label: 'Renewal Calendar', icon: Calendar },
                            { id: 'upsell', label: 'Upsell Opportunities', icon: TrendingUp },
                            { id: 'alerts', label: 'Risk Alerts', icon: Bell },
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
                                {tab.id === 'alerts' && atRiskCustomers > 0 && (
                                    <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                                        {atRiskCustomers}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {activeTab === 'health' && (
                        <>
                            {/* Search and Filters */}
                            <div className="flex flex-col md:flex-row gap-4 mb-6">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search customers..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                                <select
                                    value={filterRisk}
                                    onChange={(e) => setFilterRisk(e.target.value)}
                                    className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                >
                                    <option value="all">All Risk Levels</option>
                                    <option value="high">🔴 High Risk</option>
                                    <option value="medium">🟡 Medium Risk</option>
                                    <option value="low">🟢 Low Risk</option>
                                </select>
                            </div>

                            {/* Customer Health Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Customer</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Health Score</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Churn Risk</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Last Contact</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">ARR</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Renewal</th>
                                            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCustomers.map((customer) => (
                                            <tr key={customer.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold">
                                                            {customer.customer_name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-slate-900">{customer.customer_name}</p>
                                                            <p className="text-sm text-slate-500">{customer.contact_email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full ${getHealthBg(customer.health_score)}`}
                                                                style={{ width: `${customer.health_score}%` }}
                                                            />
                                                        </div>
                                                        <span className={`font-bold ${getHealthColor(customer.health_score)}`}>
                                                            {customer.health_score}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${riskColors[customer.churn_risk]}`}>
                                                        {riskIcons[customer.churn_risk]}
                                                        {customer.churn_risk.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className={`h-4 w-4 ${customer.days_since_contact > 14 ? 'text-red-500' : 'text-slate-400'}`} />
                                                        <span className={`text-sm ${customer.days_since_contact > 14 ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                                                            {customer.days_since_contact} days ago
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 font-medium text-slate-900">
                                                    {formatCurrency(customer.contract_value)}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-slate-600">
                                                    {customer.renewal_date
                                                        ? new Date(customer.renewal_date).toLocaleDateString()
                                                        : 'N/A'}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <button
                                                        onClick={() => setSelectedCustomer(customer)}
                                                        className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {activeTab === 'renewals' && (
                        <div className="space-y-4">
                            <p className="text-slate-600 mb-4">Upcoming contract renewals sorted by date.</p>
                            {customers
                                .filter((c) => c.renewal_date)
                                .sort((a, b) => new Date(a.renewal_date!).getTime() - new Date(b.renewal_date!).getTime())
                                .map((customer) => {
                                    const renewalDate = new Date(customer.renewal_date!);
                                    const today = new Date();
                                    const daysUntilRenewal = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                    const isUrgent = daysUntilRenewal <= 30;

                                    return (
                                        <div
                                            key={customer.id}
                                            className={`flex items-center justify-between p-4 border rounded-lg ${isUrgent ? 'border-amber-300 bg-amber-50' : 'border-slate-200'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg ${isUrgent ? 'bg-amber-100' : 'bg-slate-100'}`}>
                                                    <Calendar className={`h-5 w-5 ${isUrgent ? 'text-amber-600' : 'text-slate-600'}`} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">{customer.customer_name}</p>
                                                    <p className="text-sm text-slate-500">
                                                        Renews {renewalDate.toLocaleDateString()} ({daysUntilRenewal} days)
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="font-medium text-slate-900">{formatCurrency(customer.contract_value)}</p>
                                                    <div className="flex items-center gap-1">
                                                        <span className={`text-xs ${getHealthColor(customer.health_score)}`}>
                                                            Health: {customer.health_score}
                                                        </span>
                                                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${riskColors[customer.churn_risk]}`}>
                                                            {customer.churn_risk}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => toast.success('Renewal reminder scheduled!')}
                                                    className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                                                >
                                                    Schedule Call
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}

                    {activeTab === 'upsell' && (
                        <div className="space-y-4">
                            <p className="text-slate-600 mb-4">Identified expansion opportunities based on customer behavior and engagement.</p>
                            {upsells.map((upsell) => (
                                <div
                                    key={upsell.id}
                                    className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-green-300 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-green-100 rounded-lg">
                                            <Zap className="h-5 w-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">{upsell.customer_name}</p>
                                            <p className="text-sm text-green-600 font-medium">{upsell.opportunity}</p>
                                            <p className="text-xs text-slate-500">{upsell.reason}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="font-bold text-green-600">{formatCurrency(upsell.potential_value)}</p>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${upsell.likelihood === 'high'
                                                    ? 'bg-green-100 text-green-700'
                                                    : upsell.likelihood === 'medium'
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : 'bg-slate-100 text-slate-700'
                                                }`}>
                                                {upsell.likelihood.toUpperCase()} likelihood
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => toast.success('Opportunity created!')}
                                            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                                        >
                                            Create Opp
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-5 mt-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <TrendingUp className="h-5 w-5 text-green-600" />
                                    <h4 className="font-semibold text-green-800">Upsell Revenue Potential</h4>
                                </div>
                                <p className="text-2xl font-bold text-green-600">
                                    {formatCurrency(upsells.reduce((sum, u) => sum + u.potential_value, 0))}
                                </p>
                                <p className="text-sm text-green-700 mt-1">
                                    from {upsells.length} identified opportunities
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'alerts' && (
                        <div className="space-y-4">
                            {customers
                                .filter((c) => c.churn_risk === 'high' || c.days_since_contact > 14 || c.open_tickets > 0)
                                .map((customer) => {
                                    const alerts: { type: string; message: string; severity: 'high' | 'medium' }[] = [];

                                    if (customer.churn_risk === 'high') {
                                        alerts.push({ type: 'Churn Risk', message: 'Customer marked as high churn risk', severity: 'high' });
                                    }
                                    if (customer.days_since_contact > 14) {
                                        alerts.push({ type: 'No Contact', message: `No contact in ${customer.days_since_contact} days`, severity: 'medium' });
                                    }
                                    if (customer.open_tickets > 0) {
                                        alerts.push({ type: 'Support', message: `${customer.open_tickets} open support tickets`, severity: 'medium' });
                                    }
                                    if (customer.health_score < 50) {
                                        alerts.push({ type: 'Health', message: `Health score dropped to ${customer.health_score}`, severity: 'high' });
                                    }

                                    return (
                                        <div key={customer.id} className="border border-red-200 bg-red-50 rounded-lg p-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-red-100 rounded-lg">
                                                        <AlertTriangle className="h-5 w-5 text-red-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900">{customer.customer_name}</p>
                                                        <p className="text-sm text-slate-500">{customer.contact_email}</p>
                                                    </div>
                                                </div>
                                                <span className="font-bold text-red-600">{formatCurrency(customer.contract_value)} ARR</span>
                                            </div>
                                            <div className="mt-3 space-y-2">
                                                {alerts.map((alert, i) => (
                                                    <div
                                                        key={i}
                                                        className={`flex items-center gap-2 text-sm ${alert.severity === 'high' ? 'text-red-700' : 'text-amber-700'
                                                            }`}
                                                    >
                                                        {alert.severity === 'high' ? (
                                                            <AlertTriangle className="h-4 w-4" />
                                                        ) : (
                                                            <Clock className="h-4 w-4" />
                                                        )}
                                                        <span><strong>{alert.type}:</strong> {alert.message}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-4 flex gap-2">
                                                <button
                                                    onClick={() => toast.success('Email sent!')}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                                                >
                                                    <Mail className="h-4 w-4" />
                                                    Send Email
                                                </button>
                                                <button
                                                    onClick={() => toast.success('Call scheduled!')}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                                                >
                                                    <Phone className="h-4 w-4" />
                                                    Schedule Call
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                            {customers.filter((c) => c.churn_risk === 'high' || c.days_since_contact > 14 || c.open_tickets > 0).length === 0 && (
                                <div className="text-center py-12">
                                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                                    <p className="font-medium text-slate-900">No critical alerts!</p>
                                    <p className="text-sm text-slate-500">All customers are in good health.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Customer Detail Modal */}
            {selectedCustomer && (
                <CustomerDetailModal
                    customer={selectedCustomer}
                    onClose={() => setSelectedCustomer(null)}
                />
            )}
        </div>
    );
}

function CustomerDetailModal({ customer, onClose }: { customer: CustomerHealth; onClose: () => void }) {
    const getHealthBg = (score: number) => {
        if (score >= 75) return 'bg-green-500';
        if (score >= 50) return 'bg-amber-500';
        return 'bg-red-500';
    };

    const getHealthColor = (score: number) => {
        if (score >= 75) return 'text-green-600';
        if (score >= 50) return 'text-amber-600';
        return 'text-red-600';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                            {customer.customer_name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">{customer.customer_name}</h3>
                            <p className="text-slate-500">{customer.contact_email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Health Score Breakdown */}
                    <div>
                        <h4 className="font-semibold text-slate-900 mb-4">Health Score Breakdown</h4>
                        <div className="text-center mb-4">
                            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full border-4 ${customer.health_score >= 75 ? 'border-green-500' : customer.health_score >= 50 ? 'border-amber-500' : 'border-red-500'
                                }`}>
                                <span className={`text-3xl font-bold ${getHealthColor(customer.health_score)}`}>
                                    {customer.health_score}
                                </span>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { label: 'Engagement', score: customer.engagement_score },
                                { label: 'Adoption', score: customer.adoption_score },
                                { label: 'Satisfaction', score: customer.satisfaction_score },
                            ].map((item) => (
                                <div key={item.label} className="text-center">
                                    <p className="text-sm text-slate-600 mb-1">{item.label}</p>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1">
                                        <div className={`h-full ${getHealthBg(item.score)}`} style={{ width: `${item.score}%` }} />
                                    </div>
                                    <p className={`text-sm font-medium ${getHealthColor(item.score)}`}>{item.score}%</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-lg p-4">
                            <p className="text-sm text-slate-600">Contract Value</p>
                            <p className="text-xl font-bold text-slate-900">{formatCurrency(customer.contract_value)}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4">
                            <p className="text-sm text-slate-600">Renewal Date</p>
                            <p className="text-xl font-bold text-slate-900">
                                {customer.renewal_date ? new Date(customer.renewal_date).toLocaleDateString() : 'N/A'}
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4">
                            <p className="text-sm text-slate-600">Days Since Contact</p>
                            <p className={`text-xl font-bold ${customer.days_since_contact > 14 ? 'text-red-600' : 'text-slate-900'}`}>
                                {customer.days_since_contact}
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4">
                            <p className="text-sm text-slate-600">Open Tickets</p>
                            <p className={`text-xl font-bold ${customer.open_tickets > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                                {customer.open_tickets}
                            </p>
                        </div>
                    </div>

                    {/* Notes */}
                    {customer.notes && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <p className="text-sm font-medium text-amber-800 mb-1">Notes</p>
                            <p className="text-amber-700">{customer.notes}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-slate-200">
                        <button
                            onClick={() => toast.success('Call scheduled!')}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                        >
                            <Phone className="h-4 w-4" />
                            Schedule Call
                        </button>
                        <button
                            onClick={() => toast.success('Email sent!')}
                            className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                        >
                            <Mail className="h-4 w-4" />
                            Send Email
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
