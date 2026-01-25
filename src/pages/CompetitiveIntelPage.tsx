import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    Shield,
    Plus,
    Search,
    Filter,
    Edit2,
    Trash2,
    ChevronRight,
    Target,
    AlertTriangle,
    ThumbsUp,
    ThumbsDown,
    X,
    Save,
    ExternalLink,
    MessageSquare,
} from 'lucide-react';

interface Competitor {
    id: string;
    name: string;
    description: string | null;
    website: string | null;
    market_position: string | null;
    threat_level: string;
    is_active: boolean;
}

interface Battlecard {
    id: string;
    competitor_id: string;
    title: string;
    overview: string | null;
    strengths: string[];
    weaknesses: string[];
    win_strategies: string[];
    key_differentiators: string[];
    is_published: boolean;
    competitor?: Competitor;
}

interface ObjectionScript {
    id: string;
    objection: string;
    response: string;
    category: string | null;
    competitor_id: string | null;
    is_approved: boolean;
    competitor?: { name: string } | null;
}

const THREAT_COLORS: Record<string, string> = {
    low: 'bg-emerald-100 text-emerald-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
};

const CATEGORIES = ['pricing', 'features', 'security', 'support', 'integration', 'competitor', 'other'];

export default function CompetitiveIntelPage() {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState<'battlecards' | 'objections' | 'competitors'>('battlecards');
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [battlecards, setBattlecards] = useState<Battlecard[]>([]);
    const [objections, setObjections] = useState<ObjectionScript[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCompetitor, setSelectedCompetitor] = useState<string>('all');
    const [selectedBattlecard, setSelectedBattlecard] = useState<Battlecard | null>(null);
    const [showObjectionModal, setShowObjectionModal] = useState(false);
    const [editingObjection, setEditingObjection] = useState<ObjectionScript | null>(null);

    const [objectionForm, setObjectionForm] = useState({
        objection: '',
        response: '',
        category: 'features',
        competitor_id: '',
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [compRes, cardRes, objRes] = await Promise.all([
                (supabase as any).from('competitors').select('*').eq('is_active', true).order('name'),
                (supabase as any).from('battlecards').select('*, competitor:competitors(name, threat_level)').order('title'),
                (supabase as any).from('objection_scripts').select('*, competitor:competitors(name)').order('category'),
            ]);

            setCompetitors(compRes.data || []);
            setBattlecards(cardRes.data || []);
            setObjections(objRes.data || []);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveObjection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!objectionForm.objection || !objectionForm.response) {
            alert('Please fill in the objection and response');
            return;
        }

        try {
            const data = {
                objection: objectionForm.objection,
                response: objectionForm.response,
                category: objectionForm.category,
                competitor_id: objectionForm.competitor_id || null,
                is_approved: false,
                created_by: profile?.id,
            };

            if (editingObjection) {
                const { error } = await (supabase as any)
                    .from('objection_scripts')
                    .update(data)
                    .eq('id', editingObjection.id);
                if (error) throw error;
            } else {
                const { error } = await (supabase as any).from('objection_scripts').insert(data);
                if (error) throw error;
            }

            setShowObjectionModal(false);
            setObjectionForm({ objection: '', response: '', category: 'features', competitor_id: '' });
            setEditingObjection(null);
            loadData();
        } catch (error: any) {
            alert('Failed to save: ' + error.message);
        }
    };

    const handleDeleteObjection = async (id: string) => {
        if (!confirm('Delete this objection script?')) return;
        try {
            await (supabase as any).from('objection_scripts').delete().eq('id', id);
            loadData();
        } catch (error: any) {
            alert('Failed to delete: ' + error.message);
        }
    };

    const filteredBattlecards = battlecards.filter((bc) => {
        const matchesSearch = bc.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCompetitor = selectedCompetitor === 'all' || bc.competitor_id === selectedCompetitor;
        return matchesSearch && matchesCompetitor;
    });

    const filteredObjections = objections.filter((obj) => {
        const matchesSearch =
            obj.objection.toLowerCase().includes(searchTerm.toLowerCase()) ||
            obj.response.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCompetitor = selectedCompetitor === 'all' || obj.competitor_id === selectedCompetitor;
        return matchesSearch && matchesCompetitor;
    });

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
                    <h1 className="text-2xl font-bold text-slate-900">Competitive Intelligence</h1>
                    <p className="text-slate-600 mt-1">Battlecards, objection handling, and competitor analysis</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="border-b border-slate-200">
                    <nav className="flex -mb-px">
                        {[
                            { id: 'battlecards', label: 'Battlecards', icon: Shield },
                            { id: 'objections', label: 'Objection Handling', icon: MessageSquare },
                            { id: 'competitors', label: 'Competitors', icon: Target },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-slate-400" />
                        <select
                            value={selectedCompetitor}
                            onChange={(e) => setSelectedCompetitor(e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">All Competitors</option>
                            {competitors.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    {activeTab === 'objections' && (
                        <button
                            onClick={() => {
                                setEditingObjection(null);
                                setObjectionForm({ objection: '', response: '', category: 'features', competitor_id: '' });
                                setShowObjectionModal(true);
                            }}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            Add Script
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Battlecards Tab */}
                    {activeTab === 'battlecards' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Battlecard List */}
                            <div className="lg:col-span-1 space-y-3">
                                {filteredBattlecards.length === 0 ? (
                                    <p className="text-slate-500 text-center py-8">No battlecards found</p>
                                ) : (
                                    filteredBattlecards.map((bc) => (
                                        <button
                                            key={bc.id}
                                            onClick={() => setSelectedBattlecard(bc)}
                                            className={`w-full text-left p-4 rounded-lg border transition-colors ${selectedBattlecard?.id === bc.id
                                                    ? 'border-indigo-500 bg-indigo-50'
                                                    : 'border-slate-200 hover:border-indigo-300'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold text-slate-900">{bc.title}</h3>
                                                <ChevronRight className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <p className="text-sm text-slate-500 mt-1">{(bc.competitor as any)?.name}</p>
                                        </button>
                                    ))
                                )}
                            </div>

                            {/* Battlecard Detail */}
                            <div className="lg:col-span-2">
                                {selectedBattlecard ? (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-xl font-bold text-slate-900">{selectedBattlecard.title}</h2>
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${THREAT_COLORS[(selectedBattlecard.competitor as any)?.threat_level || 'medium']
                                                }`}>
                                                {(selectedBattlecard.competitor as any)?.threat_level || 'medium'} threat
                                            </span>
                                        </div>

                                        {selectedBattlecard.overview && (
                                            <div>
                                                <h3 className="text-sm font-medium text-slate-700 mb-2">Overview</h3>
                                                <p className="text-slate-600">{selectedBattlecard.overview}</p>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-emerald-50 rounded-lg p-4">
                                                <h3 className="text-sm font-medium text-emerald-800 mb-3 flex items-center gap-2">
                                                    <ThumbsUp className="w-4 h-4" />
                                                    Our Strengths vs Them
                                                </h3>
                                                <ul className="space-y-2">
                                                    {(selectedBattlecard.strengths || []).map((s, i) => (
                                                        <li key={i} className="text-sm text-emerald-700 flex items-start gap-2">
                                                            <span className="text-emerald-500">•</span> {s}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="bg-red-50 rounded-lg p-4">
                                                <h3 className="text-sm font-medium text-red-800 mb-3 flex items-center gap-2">
                                                    <ThumbsDown className="w-4 h-4" />
                                                    Their Weaknesses
                                                </h3>
                                                <ul className="space-y-2">
                                                    {(selectedBattlecard.weaknesses || []).map((w, i) => (
                                                        <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                                                            <span className="text-red-500">•</span> {w}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                        {selectedBattlecard.win_strategies?.length > 0 && (
                                            <div className="bg-indigo-50 rounded-lg p-4">
                                                <h3 className="text-sm font-medium text-indigo-800 mb-3 flex items-center gap-2">
                                                    <Target className="w-4 h-4" />
                                                    Win Strategies
                                                </h3>
                                                <ul className="space-y-2">
                                                    {selectedBattlecard.win_strategies.map((s, i) => (
                                                        <li key={i} className="text-sm text-indigo-700 flex items-start gap-2">
                                                            <span className="font-semibold">{i + 1}.</span> {s}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-slate-500">
                                        <Shield className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                                        <p>Select a battlecard to view details</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Objections Tab */}
                    {activeTab === 'objections' && (
                        <div className="space-y-4">
                            {filteredObjections.length === 0 ? (
                                <div className="text-center py-12">
                                    <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                                    <p className="text-slate-500">No objection scripts found</p>
                                </div>
                            ) : (
                                filteredObjections.map((obj) => (
                                    <div key={obj.id} className="border border-slate-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                                                        {obj.category}
                                                    </span>
                                                    {obj.competitor && (
                                                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded text-xs font-medium">
                                                            vs {obj.competitor.name}
                                                        </span>
                                                    )}
                                                    {obj.is_approved && (
                                                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded text-xs font-medium">
                                                            Approved
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="mb-3">
                                                    <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                                                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                                                        "{obj.objection}"
                                                    </p>
                                                </div>
                                                <div className="bg-slate-50 rounded-lg p-3">
                                                    <p className="text-sm text-slate-700">
                                                        <span className="font-medium text-emerald-600">Response:</span> {obj.response}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingObjection(obj);
                                                        setObjectionForm({
                                                            objection: obj.objection,
                                                            response: obj.response,
                                                            category: obj.category || 'features',
                                                            competitor_id: obj.competitor_id || '',
                                                        });
                                                        setShowObjectionModal(true);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteObjection(obj.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* Competitors Tab */}
                    {activeTab === 'competitors' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {competitors.map((comp) => (
                                <div key={comp.id} className="border border-slate-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="font-semibold text-slate-900">{comp.name}</h3>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${THREAT_COLORS[comp.threat_level]}`}>
                                            {comp.threat_level}
                                        </span>
                                    </div>
                                    {comp.description && (
                                        <p className="text-sm text-slate-600 mb-3">{comp.description}</p>
                                    )}
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500 capitalize">{comp.market_position?.replace('_', ' ')}</span>
                                        {comp.website && (
                                            <a
                                                href={comp.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                            >
                                                Website <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Objection Modal */}
            {showObjectionModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
                        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-900">
                                {editingObjection ? 'Edit Objection Script' : 'Add Objection Script'}
                            </h2>
                            <button onClick={() => setShowObjectionModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveObjection} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                                    <select
                                        value={objectionForm.category}
                                        onChange={(e) => setObjectionForm({ ...objectionForm, category: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {CATEGORIES.map((c) => (
                                            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Competitor (optional)</label>
                                    <select
                                        value={objectionForm.competitor_id}
                                        onChange={(e) => setObjectionForm({ ...objectionForm, competitor_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">General</option>
                                        {competitors.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Objection *</label>
                                <textarea
                                    value={objectionForm.objection}
                                    onChange={(e) => setObjectionForm({ ...objectionForm, objection: e.target.value })}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    placeholder="What the customer says..."
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Response *</label>
                                <textarea
                                    value={objectionForm.response}
                                    onChange={(e) => setObjectionForm({ ...objectionForm, response: e.target.value })}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    placeholder="How to respond..."
                                    required
                                />
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-200">
                                <button
                                    type="submit"
                                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium"
                                >
                                    <Save className="w-4 h-4" />
                                    {editingObjection ? 'Update' : 'Save'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowObjectionModal(false)}
                                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
