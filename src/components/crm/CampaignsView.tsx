import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import {
    Megaphone,
    Plus,
    Search,
    Calendar,
    DollarSign,
    TrendingUp,
    Target,
    BarChart3,
    Edit2,
    Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../lib/currencyUtils';

interface Campaign {
    id: string;
    name: string;
    type: string;
    status: string;
    start_date: string;
    end_date: string;
    budget: number;
    actual_cost: number;
    expected_revenue: number;
    description: string;
}

export default function CampaignsView() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);

    const { data: campaigns, isLoading } = useQuery({
        queryKey: ['crm-campaigns'],
        queryFn: async () => {
            const { data, error } = await (supabase as any).from('crm_campaigns').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return data as Campaign[];
        },
    });

    const filteredCampaigns = campaigns?.filter((c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 font-inter">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4 flex-1 w-full">
                    <div className="bg-orange-100 p-3 rounded-xl">
                        <Megaphone className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-slate-900">Marketing Campaigns</h2>
                        <p className="text-sm text-slate-500">Track attribution and ROI across all channels</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search campaigns..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                        />
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20"
                    >
                        <Plus className="h-5 w-5" />
                        New Campaign
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-2xl border border-slate-200"></div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredCampaigns?.map((campaign) => (
                        <div key={campaign.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className="absolute top-0 right-0 h-24 w-24 bg-orange-500/5 blur-2xl rounded-full -mr-8 -mt-8"></div>

                            <div className="flex items-start justify-between mb-6 relative z-10">
                                <div>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase mb-2">
                                        {campaign.type}
                                    </span>
                                    <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{campaign.name}</h3>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${campaign.status === 'active' ? 'bg-green-100 text-green-700' :
                                        campaign.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                            'bg-slate-100 text-slate-600'
                                    }`}>
                                    {campaign.status}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-3 bg-slate-50 rounded-xl">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Budget</p>
                                    <p className="text-sm font-bold text-slate-900">{formatCurrency(campaign.budget)}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Start Date</p>
                                    <p className="text-sm font-bold text-slate-900">{new Date(campaign.start_date).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <div className="flex justify-between text-xs font-bold mb-1.5 uppercase">
                                        <span className="text-slate-400">Campaign ROI</span>
                                        <span className="text-orange-600">65%</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-orange-500 w-[65%]" />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                                <div className="flex -space-x-2">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-slate-200" />
                                    ))}
                                </div>
                                <button className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 group/btn">
                                    View Analytics
                                    <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function ArrowRight({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
        </svg>
    );
}
