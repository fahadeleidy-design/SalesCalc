import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
    Presentation,
    Target,
    Clock,
    CheckCircle,
    FileText,
    Users,
    TrendingUp,
    Calendar,
    Eye,
    Wrench,
    Award
} from 'lucide-react';
import PricingModal from '../components/engineering/PricingModal';
import QuotationViewModal from '../components/quotations/QuotationViewModal';
import type { Database } from '../lib/database.types';

type CustomItemRequest = Database['public']['Tables']['custom_item_requests']['Row'] & {
    quotation: Database['public']['Tables']['quotations']['Row'];
    requester: Database['public']['Tables']['profiles']['Row'];
    quotation_item: Database['public']['Tables']['quotation_items']['Row'];
};

interface DemoStat {
    label: string;
    value: number | string;
    icon: typeof Presentation;
    color: string;
    bgColor: string;
}

export default function SolutionConsultantDashboard() {
    const [pricingRequests, setPricingRequests] = useState<CustomItemRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<CustomItemRequest | null>(null);
    const [viewingQuotationId, setViewingQuotationId] = useState<string | null>(null);
    const [opportunityStats, setOpportunityStats] = useState({
        total: 0,
        qualified: 0,
        proposalSent: 0,
        wonThisMonth: 0,
    });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Fetch pending pricing requests (same as engineering)
            const { data: requests } = await supabase
                .from('custom_item_requests')
                .select(`
          *,
          quotation:quotations!custom_item_requests_quotation_id_fkey(*),
          requester:profiles!custom_item_requests_requested_by_fkey(*),
          quotation_item:quotation_items!custom_item_requests_quotation_item_id_fkey(*)
        `)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(10);

            setPricingRequests((requests as any) || []);

            // Fetch opportunity stats
            const { data: opportunities } = await supabase
                .from('crm_opportunities')
                .select('stage, value, close_date')
                .gte('created_at', new Date(new Date().setDate(1)).toISOString());

            if (opportunities) {
                const stats = {
                    total: opportunities.length,
                    qualified: opportunities.filter((o: any) => o.stage === 'qualified').length,
                    proposalSent: opportunities.filter((o: any) => o.stage === 'proposal').length,
                    wonThisMonth: opportunities.filter((o: any) => o.stage === 'closed_won').length,
                };
                setOpportunityStats(stats);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePriceSubmit = () => {
        setSelectedRequest(null);
        fetchDashboardData();
    };

    const stats: DemoStat[] = [
        {
            label: 'Pending Pricing',
            value: pricingRequests.length,
            icon: Wrench,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
        },
        {
            label: 'Active Opportunities',
            value: opportunityStats.total,
            icon: Target,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
        },
        {
            label: 'Proposals Sent',
            value: opportunityStats.proposalSent,
            icon: FileText,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
        },
        {
            label: 'Deals Won (MTD)',
            value: opportunityStats.wonThisMonth,
            icon: Award,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
        },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Solution Consultant Dashboard</h1>
                    <p className="text-slate-600 mt-1">Manage demos, pricing, and technical discoveries</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">
                        Solution Consultant
                    </span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-600">{stat.label}</p>
                                <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                            </div>
                            <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending Pricing Requests */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                    <div className="p-6 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-50 rounded-lg">
                                    <Wrench className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">Pending Pricing</h2>
                                    <p className="text-sm text-slate-500">Custom items awaiting your review</p>
                                </div>
                            </div>
                            <span className="px-2.5 py-1 bg-orange-100 text-orange-600 rounded-full text-sm font-medium">
                                {pricingRequests.length}
                            </span>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                        {pricingRequests.length === 0 ? (
                            <div className="p-6 text-center text-slate-500">
                                <CheckCircle className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
                                <p>All caught up! No pending pricing requests.</p>
                            </div>
                        ) : (
                            pricingRequests.map((request) => (
                                <div
                                    key={request.id}
                                    className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                                    onClick={() => setSelectedRequest(request)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-900 truncate">
                                                {request.description}
                                            </p>
                                            <p className="text-sm text-slate-500 mt-1">
                                                {request.quotation.quotation_number} • {request.requester.full_name}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setViewingQuotationId(request.quotation_id);
                                            }}
                                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Quick Actions & Resources */}
                <div className="space-y-6">
                    {/* This Week's Focus */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <Calendar className="w-5 h-5 text-indigo-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">This Week's Focus</h2>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm text-slate-700">Pricing requests to complete</span>
                                </div>
                                <span className="font-semibold text-slate-900">{pricingRequests.length}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Target className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm text-slate-700">Opportunities in pipeline</span>
                                </div>
                                <span className="font-semibold text-slate-900">{opportunityStats.total}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm text-slate-700">Technical win rate</span>
                                </div>
                                <span className="font-semibold text-emerald-600">
                                    {opportunityStats.total > 0
                                        ? Math.round((opportunityStats.wonThisMonth / opportunityStats.total) * 100)
                                        : 0}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <button className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left">
                                <Presentation className="w-5 h-5 text-indigo-600" />
                                <div>
                                    <p className="font-medium text-slate-900 text-sm">Schedule Demo</p>
                                    <p className="text-xs text-slate-500">Coming soon</p>
                                </div>
                            </button>
                            <button className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left">
                                <FileText className="w-5 h-5 text-purple-600" />
                                <div>
                                    <p className="font-medium text-slate-900 text-sm">Discovery Form</p>
                                    <p className="text-xs text-slate-500">Coming soon</p>
                                </div>
                            </button>
                            <button className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left">
                                <Users className="w-5 h-5 text-blue-600" />
                                <div>
                                    <p className="font-medium text-slate-900 text-sm">View CRM</p>
                                    <p className="text-xs text-slate-500">Leads & Opportunities</p>
                                </div>
                            </button>
                            <button className="flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left">
                                <Wrench className="w-5 h-5 text-orange-600" />
                                <div>
                                    <p className="font-medium text-slate-900 text-sm">Custom Items</p>
                                    <p className="text-xs text-slate-500">View all requests</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pricing Modal */}
            {selectedRequest && (
                <PricingModal
                    request={selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                    onSubmit={handlePriceSubmit}
                />
            )}

            {/* Quotation View Modal */}
            {viewingQuotationId && (
                <QuotationViewModal
                    quotationId={viewingQuotationId}
                    onClose={() => setViewingQuotationId(null)}
                    onDelete={() => {
                        setViewingQuotationId(null);
                        fetchDashboardData();
                    }}
                />
            )}
        </div>
    );
}
