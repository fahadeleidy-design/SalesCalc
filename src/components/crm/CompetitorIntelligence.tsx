import { useState } from 'react';
import {
    Target,
    Plus,
    Search,
    X,
    TrendingUp,
    Award,
    AlertTriangle,
    CheckCircle,
    Shield,
    Zap,
    DollarSign,
    Globe,
    BarChart3,
    Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../lib/currencyUtils';

interface Competitor {
    id: string;
    name: string;
    website?: string;
    description?: string;
    market_position: 'leader' | 'challenger' | 'nicher' | 'follower';
    strengths: string[];
    weaknesses: string[];
    pricing_notes?: string;
    key_products?: string[];
    target_market?: string;
    wins_against: number;
    losses_against: number;
    no_decision: number;
    created_at: string;
}

interface CompetitorDeal {
    id: string;
    competitor_id: string;
    opportunity_name: string;
    deal_value: number;
    outcome: 'won' | 'lost' | 'no_decision';
    outcome_reason?: string;
    date: string;
}

// Mock data for demonstration
const mockCompetitors: Competitor[] = [
    {
        id: '1',
        name: 'SalesPro CRM',
        website: 'https://salespro.com',
        description: 'Enterprise-focused CRM with strong analytics capabilities',
        market_position: 'leader',
        strengths: ['Strong brand recognition', 'Advanced analytics', 'Large partner network', 'Enterprise integrations'],
        weaknesses: ['Expensive', 'Complex implementation', 'Slow support response'],
        pricing_notes: 'Starting at $150/user/month. Enterprise packages from $300/user/month.',
        key_products: ['CRM Core', 'Analytics Suite', 'Service Cloud'],
        target_market: 'Large Enterprise (1000+ employees)',
        wins_against: 8,
        losses_against: 12,
        no_decision: 5,
        created_at: '2024-01-15',
    },
    {
        id: '2',
        name: 'QuickSales',
        website: 'https://quicksales.io',
        description: 'SMB-focused solution with easy onboarding',
        market_position: 'challenger',
        strengths: ['Easy to use', 'Quick implementation', 'Affordable pricing', 'Good mobile app'],
        weaknesses: ['Limited customization', 'Basic reporting', 'No enterprise features'],
        pricing_notes: 'Starting at $29/user/month. Professional at $79/user/month.',
        key_products: ['Sales CRM', 'Marketing Automation'],
        target_market: 'SMB (10-200 employees)',
        wins_against: 15,
        losses_against: 6,
        no_decision: 3,
        created_at: '2024-03-20',
    },
    {
        id: '3',
        name: 'CloudDeal',
        website: 'https://clouddeal.net',
        description: 'Cloud-native CRM with AI features',
        market_position: 'challenger',
        strengths: ['AI-powered insights', 'Modern UI', 'API-first approach', 'Competitive pricing'],
        weaknesses: ['Newer to market', 'Limited integrations', 'Smaller support team'],
        pricing_notes: 'Starting at $49/user/month. AI features at $99/user/month.',
        key_products: ['AI CRM', 'Revenue Intelligence'],
        target_market: 'Mid-Market (200-1000 employees)',
        wins_against: 10,
        losses_against: 8,
        no_decision: 4,
        created_at: '2024-06-10',
    },
];

const mockDeals: CompetitorDeal[] = [
    { id: '1', competitor_id: '1', opportunity_name: 'Alpha Corp Deal', deal_value: 450000, outcome: 'won', outcome_reason: 'Better pricing and local support', date: '2025-01-05' },
    { id: '2', competitor_id: '1', opportunity_name: 'Beta Industries', deal_value: 280000, outcome: 'lost', outcome_reason: 'They preferred SalesPro analytics', date: '2025-01-08' },
    { id: '3', competitor_id: '2', opportunity_name: 'Gamma Solutions', deal_value: 85000, outcome: 'won', outcome_reason: 'Our customization won them over', date: '2025-01-12' },
    { id: '4', competitor_id: '3', opportunity_name: 'Delta Tech', deal_value: 190000, outcome: 'lost', outcome_reason: 'CloudDeal AI features impressed them', date: '2025-01-15' },
];

export default function CompetitorIntelligence() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showBattlecard, setShowBattlecard] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'battlecards' | 'analysis'>('overview');

    const competitors = mockCompetitors;
    const deals = mockDeals;

    const filteredCompetitors = competitors.filter((c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculate overall stats
    const totalWins = competitors.reduce((sum, c) => sum + c.wins_against, 0);
    const totalLosses = competitors.reduce((sum, c) => sum + c.losses_against, 0);
    const overallWinRate = totalWins + totalLosses > 0
        ? Math.round((totalWins / (totalWins + totalLosses)) * 100)
        : 0;

    const marketPositionColors: Record<string, string> = {
        leader: 'bg-purple-100 text-purple-700',
        challenger: 'bg-blue-100 text-blue-700',
        nicher: 'bg-green-100 text-green-700',
        follower: 'bg-slate-100 text-slate-700',
    };

    const outcomeColors: Record<string, string> = {
        won: 'bg-green-100 text-green-700',
        lost: 'bg-red-100 text-red-700',
        no_decision: 'bg-slate-100 text-slate-700',
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Target className="h-7 w-7 text-orange-500" />
                        Competitor Intelligence
                    </h2>
                    <p className="text-slate-600 mt-1">Track competitors and analyze win/loss patterns</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Add Competitor
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Tracked Competitors</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{competitors.length}</p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <Target className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Overall Win Rate</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">{overallWinRate}%</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">{totalWins} wins / {totalLosses} losses</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Competitive Deals</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{deals.length}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <BarChart3 className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Biggest Threat</p>
                            <p className="text-lg font-bold text-red-600 mt-1">
                                {competitors.sort((a, b) => b.losses_against - a.losses_against)[0]?.name || 'N/A'}
                            </p>
                        </div>
                        <div className="p-3 bg-red-100 rounded-lg">
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="border-b border-slate-200">
                    <nav className="flex gap-6 px-6">
                        {[
                            { id: 'overview', label: 'Competitor Overview', icon: Eye },
                            { id: 'battlecards', label: 'Battlecards', icon: Shield },
                            { id: 'analysis', label: 'Win/Loss Analysis', icon: BarChart3 },
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
                    {activeTab === 'overview' && (
                        <>
                            {/* Search */}
                            <div className="relative mb-6">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search competitors..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full md:w-96 pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                                />
                            </div>

                            {/* Competitors Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredCompetitors.map((competitor) => {
                                    const winRate = competitor.wins_against + competitor.losses_against > 0
                                        ? Math.round((competitor.wins_against / (competitor.wins_against + competitor.losses_against)) * 100)
                                        : 0;
                                    return (
                                        <div
                                            key={competitor.id}
                                            className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer"
                                            onClick={() => {
                                                setSelectedCompetitor(competitor);
                                                setShowBattlecard(true);
                                            }}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h3 className="font-semibold text-slate-900">{competitor.name}</h3>
                                                    {competitor.website && (
                                                        <a
                                                            href={competitor.website}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-sm text-orange-600 hover:underline flex items-center gap-1"
                                                        >
                                                            <Globe className="h-3 w-3" />
                                                            Website
                                                        </a>
                                                    )}
                                                </div>
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${marketPositionColors[competitor.market_position]}`}>
                                                    {competitor.market_position}
                                                </span>
                                            </div>

                                            <p className="text-sm text-slate-600 mb-4 line-clamp-2">{competitor.description}</p>

                                            {/* Win/Loss Stats */}
                                            <div className="flex items-center gap-4 mb-3">
                                                <div className="flex items-center gap-1">
                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                    <span className="text-sm font-medium text-green-600">{competitor.wins_against} wins</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <X className="h-4 w-4 text-red-500" />
                                                    <span className="text-sm font-medium text-red-600">{competitor.losses_against} losses</span>
                                                </div>
                                            </div>

                                            {/* Win Rate Bar */}
                                            <div className="mb-2">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-slate-600">Win Rate vs. Them</span>
                                                    <span className={`font-medium ${winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {winRate}%
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full ${winRate >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                                                        style={{ width: `${winRate}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Quick Strengths Preview */}
                                            <div className="flex flex-wrap gap-1">
                                                {competitor.strengths.slice(0, 2).map((strength, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                                                        {strength}
                                                    </span>
                                                ))}
                                                {competitor.strengths.length > 2 && (
                                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                                                        +{competitor.strengths.length - 2}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {activeTab === 'battlecards' && (
                        <div className="space-y-4">
                            <p className="text-slate-600 mb-4">Click on a competitor card below to view their full battlecard.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {competitors.map((competitor) => (
                                    <div
                                        key={competitor.id}
                                        className="border border-slate-200 rounded-lg p-4 hover:border-orange-300 cursor-pointer transition-colors"
                                        onClick={() => {
                                            setSelectedCompetitor(competitor);
                                            setShowBattlecard(true);
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-semibold text-slate-900">{competitor.name}</h3>
                                            <Shield className="h-5 w-5 text-orange-500" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Top Strengths</p>
                                                <ul className="text-sm space-y-1">
                                                    {competitor.strengths.slice(0, 2).map((s, i) => (
                                                        <li key={i} className="text-green-600 flex items-center gap-1">
                                                            <Zap className="h-3 w-3" /> {s}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-1">Key Weaknesses</p>
                                                <ul className="text-sm space-y-1">
                                                    {competitor.weaknesses.slice(0, 2).map((w, i) => (
                                                        <li key={i} className="text-red-600 flex items-center gap-1">
                                                            <AlertTriangle className="h-3 w-3" /> {w}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'analysis' && (
                        <div className="space-y-6">
                            {/* Win/Loss Trend */}
                            <div className="border border-slate-200 rounded-lg p-5">
                                <h3 className="font-semibold text-slate-900 mb-4">Recent Competitive Deals</h3>
                                <div className="space-y-3">
                                    {deals.slice(0, 10).map((deal) => {
                                        const competitor = competitors.find((c) => c.id === deal.competitor_id);
                                        return (
                                            <div key={deal.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                                <div className="flex items-center gap-4">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${outcomeColors[deal.outcome]}`}>
                                                        {deal.outcome.toUpperCase()}
                                                    </span>
                                                    <div>
                                                        <p className="font-medium text-slate-900">{deal.opportunity_name}</p>
                                                        <p className="text-sm text-slate-500">
                                                            vs. {competitor?.name} • {new Date(deal.date).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-medium text-slate-900">{formatCurrency(deal.deal_value)}</p>
                                                    {deal.outcome_reason && (
                                                        <p className="text-xs text-slate-500 max-w-xs truncate">{deal.outcome_reason}</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Win Rate by Competitor */}
                            <div className="border border-slate-200 rounded-lg p-5">
                                <h3 className="font-semibold text-slate-900 mb-4">Win Rate by Competitor</h3>
                                <div className="space-y-4">
                                    {competitors
                                        .sort((a, b) => {
                                            const aRate = a.wins_against / (a.wins_against + a.losses_against) || 0;
                                            const bRate = b.wins_against / (b.wins_against + b.losses_against) || 0;
                                            return bRate - aRate;
                                        })
                                        .map((competitor) => {
                                            const total = competitor.wins_against + competitor.losses_against;
                                            const winRate = total > 0 ? Math.round((competitor.wins_against / total) * 100) : 0;
                                            return (
                                                <div key={competitor.id} className="flex items-center gap-4">
                                                    <span className="w-32 text-sm font-medium text-slate-900 truncate">
                                                        {competitor.name}
                                                    </span>
                                                    <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden flex">
                                                        <div
                                                            className="h-full bg-green-500 flex items-center justify-end pr-2"
                                                            style={{ width: `${winRate}%` }}
                                                        >
                                                            {winRate > 20 && (
                                                                <span className="text-xs text-white font-medium">{competitor.wins_against}W</span>
                                                            )}
                                                        </div>
                                                        <div
                                                            className="h-full bg-red-400 flex items-center pl-2"
                                                            style={{ width: `${100 - winRate}%` }}
                                                        >
                                                            {100 - winRate > 20 && (
                                                                <span className="text-xs text-white font-medium">{competitor.losses_against}L</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className={`w-12 text-right text-sm font-bold ${winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {winRate}%
                                                    </span>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Battlecard Modal */}
            {showBattlecard && selectedCompetitor && (
                <BattlecardModal
                    competitor={selectedCompetitor}
                    onClose={() => {
                        setShowBattlecard(false);
                        setSelectedCompetitor(null);
                    }}
                />
            )}

            {/* Add Competitor Modal */}
            {showAddModal && (
                <AddCompetitorModal onClose={() => setShowAddModal(false)} />
            )}
        </div>
    );
}

function BattlecardModal({ competitor, onClose }: { competitor: Competitor; onClose: () => void }) {
    const winRate = competitor.wins_against + competitor.losses_against > 0
        ? Math.round((competitor.wins_against / (competitor.wins_against + competitor.losses_against)) * 100)
        : 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-orange-50 to-amber-50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-lg shadow-sm">
                            <Shield className="h-8 w-8 text-orange-600" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900">{competitor.name}</h3>
                            <p className="text-slate-600">Competitive Battlecard</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-slate-50 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-slate-900">{winRate}%</p>
                            <p className="text-sm text-slate-600">Win Rate</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-green-600">{competitor.wins_against}</p>
                            <p className="text-sm text-slate-600">Wins</p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 text-center">
                            <p className="text-2xl font-bold text-red-600">{competitor.losses_against}</p>
                            <p className="text-sm text-slate-600">Losses</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4 text-center">
                            <p className="text-lg font-bold text-purple-600 capitalize">{competitor.market_position}</p>
                            <p className="text-sm text-slate-600">Position</p>
                        </div>
                    </div>

                    {/* Company Overview */}
                    <div className="border border-slate-200 rounded-lg p-5">
                        <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <Globe className="h-5 w-5 text-slate-400" />
                            Company Overview
                        </h4>
                        <p className="text-slate-600 mb-3">{competitor.description}</p>
                        {competitor.website && (
                            <a href={competitor.website} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline text-sm">
                                {competitor.website}
                            </a>
                        )}
                        {competitor.target_market && (
                            <p className="text-sm text-slate-500 mt-2">
                                <strong>Target Market:</strong> {competitor.target_market}
                            </p>
                        )}
                    </div>

                    {/* Strengths & Weaknesses */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="border border-green-200 bg-green-50 rounded-lg p-5">
                            <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                                <Zap className="h-5 w-5" />
                                Their Strengths (Watch Out)
                            </h4>
                            <ul className="space-y-2">
                                {competitor.strengths.map((strength, i) => (
                                    <li key={i} className="flex items-start gap-2 text-green-700">
                                        <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                        <span>{strength}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="border border-red-200 bg-red-50 rounded-lg p-5">
                            <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                                <Target className="h-5 w-5" />
                                Their Weaknesses (Attack Here)
                            </h4>
                            <ul className="space-y-2">
                                {competitor.weaknesses.map((weakness, i) => (
                                    <li key={i} className="flex items-start gap-2 text-red-700">
                                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                                        <span>{weakness}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Pricing Intel */}
                    {competitor.pricing_notes && (
                        <div className="border border-slate-200 rounded-lg p-5">
                            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-slate-400" />
                                Pricing Intelligence
                            </h4>
                            <p className="text-slate-600">{competitor.pricing_notes}</p>
                        </div>
                    )}

                    {/* Key Products */}
                    {competitor.key_products && competitor.key_products.length > 0 && (
                        <div className="border border-slate-200 rounded-lg p-5">
                            <h4 className="font-semibold text-slate-900 mb-3">Key Products</h4>
                            <div className="flex flex-wrap gap-2">
                                {competitor.key_products.map((product, i) => (
                                    <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                                        {product}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Winning Tactics */}
                    <div className="border border-orange-200 bg-orange-50 rounded-lg p-5">
                        <h4 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                            <Award className="h-5 w-5" />
                            How to Win Against {competitor.name}
                        </h4>
                        <ul className="space-y-2 text-orange-800">
                            <li className="flex items-start gap-2">
                                <span className="font-bold">1.</span>
                                <span>Focus on their weaknesses: {competitor.weaknesses[0]?.toLowerCase()}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold">2.</span>
                                <span>Emphasize our strengths in areas where they're weak</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold">3.</span>
                                <span>If they mention "{competitor.strengths[0]}", counter with our local support and customization</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold">4.</span>
                                <span>Use pricing as leverage - they are typically {competitor.market_position === 'leader' ? 'more expensive' : 'similarly priced'}</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-slate-200 bg-slate-50">
                    <button
                        onClick={() => toast.success('Battlecard copied to clipboard!')}
                        className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                    >
                        Copy Battlecard
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-white"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

function AddCompetitorModal({ onClose }: { onClose: () => void }) {
    const [formData, setFormData] = useState({
        name: '',
        website: '',
        description: '',
        market_position: 'challenger',
        strengths: '',
        weaknesses: '',
        pricing_notes: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        toast.success('Competitor added successfully (demo)');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <h3 className="text-xl font-bold text-slate-900">Add Competitor</h3>
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
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                        <input
                            type="url"
                            value={formData.website}
                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            placeholder="https://..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea
                            rows={2}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            placeholder="Brief description of this competitor..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Market Position</label>
                        <select
                            value={formData.market_position}
                            onChange={(e) => setFormData({ ...formData, market_position: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="leader">Leader</option>
                            <option value="challenger">Challenger</option>
                            <option value="nicher">Nicher</option>
                            <option value="follower">Follower</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Strengths (one per line)
                        </label>
                        <textarea
                            rows={3}
                            value={formData.strengths}
                            onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            placeholder="Strong brand&#10;Good pricing&#10;Fast support"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Weaknesses (one per line)
                        </label>
                        <textarea
                            rows={3}
                            value={formData.weaknesses}
                            onChange={(e) => setFormData({ ...formData, weaknesses: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            placeholder="Expensive&#10;Complex setup&#10;Limited features"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Pricing Notes</label>
                        <textarea
                            rows={2}
                            value={formData.pricing_notes}
                            onChange={(e) => setFormData({ ...formData, pricing_notes: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                            placeholder="Their pricing structure, discounts, etc."
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                        >
                            Add Competitor
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
