import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    FileText,
    Plus,
    Calendar,
    CheckCircle,
    Edit2,
    Trash2,
    Target,
    Search,
    Filter,
    X,
    Save,
    ClipboardList,
    Building,
    Users,
} from 'lucide-react';

type DiscoveryStatus = 'draft' | 'in_progress' | 'completed' | 'archived';

interface TechnicalDiscovery {
    id: string;
    title: string;
    status: DiscoveryStatus;
    opportunity_id: string | null;
    lead_id: string | null;
    discovery_date: string | null;
    current_solution: string | null;
    pain_points: string | null;
    desired_outcomes: string | null;
    success_criteria: string | null;
    decision_timeline: string | null;
    budget_range: string | null;
    technical_fit_score: number | null;
    business_fit_score: number | null;
    summary: string | null;
    next_steps: string | null;
    risks_and_concerns: string | null;
    created_at: string;
    opportunity?: { name: string; customer?: { company_name: string } } | null;
    conductor?: { full_name: string } | null;
}

interface FormData {
    title: string;
    status: DiscoveryStatus;
    opportunity_id: string;
    discovery_date: string;
    current_solution: string;
    pain_points: string;
    desired_outcomes: string;
    success_criteria: string;
    decision_timeline: string;
    budget_range: string;
    technical_fit_score: number | null;
    business_fit_score: number | null;
    summary: string;
    next_steps: string;
    risks_and_concerns: string;
}

const STATUS_COLORS: Record<DiscoveryStatus, string> = {
    draft: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    archived: 'bg-amber-100 text-amber-700',
};

const TIMELINE_OPTIONS = ['Immediate', '1-3 months', '3-6 months', '6+ months'];
const BUDGET_OPTIONS = ['Under $10K', '$10K-$50K', '$50K-$100K', '$100K+'];

export default function TechnicalDiscoveryPage() {
    const { profile } = useAuth();
    const [discoveries, setDiscoveries] = useState<TechnicalDiscovery[]>([]);
    const [opportunities, setOpportunities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingDiscovery, setEditingDiscovery] = useState<TechnicalDiscovery | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<DiscoveryStatus | 'all'>('all');

    const [formData, setFormData] = useState<FormData>({
        title: '',
        status: 'draft',
        opportunity_id: '',
        discovery_date: new Date().toISOString().split('T')[0],
        current_solution: '',
        pain_points: '',
        desired_outcomes: '',
        success_criteria: '',
        decision_timeline: '',
        budget_range: '',
        technical_fit_score: null,
        business_fit_score: null,
        summary: '',
        next_steps: '',
        risks_and_concerns: '',
    });

    useEffect(() => {
        loadDiscoveries();
        loadOpportunities();
    }, []);

    const loadDiscoveries = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('technical_discoveries')
                .select(`
          *,
          opportunity:crm_opportunities(name, customer:customers(company_name)),
          conductor:profiles!technical_discoveries_conducted_by_fkey(full_name)
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setDiscoveries((data as any) || []);
        } catch (error) {
            console.error('Error loading discoveries:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadOpportunities = async () => {
        const { data } = await supabase
            .from('crm_opportunities')
            .select('id, name, customer:customers(company_name)')
            .order('name');
        setOpportunities(data || []);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title) {
            alert('Please enter a title');
            return;
        }

        try {
            const discoveryData = {
                title: formData.title,
                status: formData.status,
                opportunity_id: formData.opportunity_id || null,
                discovery_date: formData.discovery_date || null,
                current_solution: formData.current_solution || null,
                pain_points: formData.pain_points || null,
                desired_outcomes: formData.desired_outcomes || null,
                success_criteria: formData.success_criteria || null,
                decision_timeline: formData.decision_timeline || null,
                budget_range: formData.budget_range || null,
                technical_fit_score: formData.technical_fit_score,
                business_fit_score: formData.business_fit_score,
                summary: formData.summary || null,
                next_steps: formData.next_steps || null,
                risks_and_concerns: formData.risks_and_concerns || null,
                conducted_by: profile?.id,
            };

            if (editingDiscovery) {
                const { error } = await (supabase as any)
                    .from('technical_discoveries')
                    .update(discoveryData)
                    .eq('id', editingDiscovery.id);
                if (error) throw error;
            } else {
                const { error } = await (supabase as any)
                    .from('technical_discoveries')
                    .insert({ ...discoveryData, created_by: profile?.id });
                if (error) throw error;
            }

            setShowModal(false);
            resetForm();
            loadDiscoveries();
        } catch (error: any) {
            console.error('Error saving discovery:', error);
            alert('Failed to save discovery: ' + error.message);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            status: 'draft',
            opportunity_id: '',
            discovery_date: new Date().toISOString().split('T')[0],
            current_solution: '',
            pain_points: '',
            desired_outcomes: '',
            success_criteria: '',
            decision_timeline: '',
            budget_range: '',
            technical_fit_score: null,
            business_fit_score: null,
            summary: '',
            next_steps: '',
            risks_and_concerns: '',
        });
        setEditingDiscovery(null);
    };

    const handleEdit = (discovery: TechnicalDiscovery) => {
        setEditingDiscovery(discovery);
        setFormData({
            title: discovery.title,
            status: discovery.status,
            opportunity_id: discovery.opportunity_id || '',
            discovery_date: discovery.discovery_date?.split('T')[0] || '',
            current_solution: discovery.current_solution || '',
            pain_points: discovery.pain_points || '',
            desired_outcomes: discovery.desired_outcomes || '',
            success_criteria: discovery.success_criteria || '',
            decision_timeline: discovery.decision_timeline || '',
            budget_range: discovery.budget_range || '',
            technical_fit_score: discovery.technical_fit_score,
            business_fit_score: discovery.business_fit_score,
            summary: discovery.summary || '',
            next_steps: discovery.next_steps || '',
            risks_and_concerns: discovery.risks_and_concerns || '',
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this discovery?')) return;

        try {
            const { error } = await supabase.from('technical_discoveries').delete().eq('id', id);
            if (error) throw error;
            loadDiscoveries();
        } catch (error: any) {
            alert('Failed to delete discovery: ' + error.message);
        }
    };

    const filteredDiscoveries = discoveries.filter((discovery) => {
        const matchesSearch =
            discovery.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            discovery.opportunity?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            discovery.opportunity?.customer?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || discovery.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const stats = {
        total: discoveries.length,
        draft: discoveries.filter((d) => d.status === 'draft').length,
        inProgress: discoveries.filter((d) => d.status === 'in_progress').length,
        completed: discoveries.filter((d) => d.status === 'completed').length,
    };

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
                    <h1 className="text-2xl font-bold text-slate-900">Technical Discovery</h1>
                    <p className="text-slate-600 mt-1">Capture and track customer technical requirements</p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    New Discovery
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Total</p>
                            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                        </div>
                        <ClipboardList className="w-8 h-8 text-indigo-500" />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Draft</p>
                            <p className="text-2xl font-bold text-slate-600">{stats.draft}</p>
                        </div>
                        <FileText className="w-8 h-8 text-slate-400" />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">In Progress</p>
                            <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                        </div>
                        <Target className="w-8 h-8 text-blue-500" />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Completed</p>
                            <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search discoveries..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-slate-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as DiscoveryStatus | 'all')}
                            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">All Status</option>
                            <option value="draft">Draft</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Discoveries List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                {filteredDiscoveries.length === 0 ? (
                    <div className="p-12 text-center">
                        <ClipboardList className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-2">No discoveries found</h3>
                        <p className="text-slate-500 mb-4">Start by creating your first technical discovery</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            <Plus className="w-4 h-4" />
                            New Discovery
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredDiscoveries.map((discovery) => (
                            <div key={discovery.id} className="p-4 hover:bg-slate-50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold text-slate-900 truncate">{discovery.title}</h3>
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[discovery.status]}`}
                                            >
                                                {discovery.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                                            {discovery.discovery_date && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {new Date(discovery.discovery_date).toLocaleDateString()}
                                                </span>
                                            )}
                                            {discovery.opportunity && (
                                                <span className="flex items-center gap-1">
                                                    <Target className="w-4 h-4" />
                                                    {discovery.opportunity.name}
                                                </span>
                                            )}
                                            {discovery.opportunity?.customer && (
                                                <span className="flex items-center gap-1">
                                                    <Building className="w-4 h-4" />
                                                    {discovery.opportunity.customer.company_name}
                                                </span>
                                            )}
                                            {(discovery.technical_fit_score || discovery.business_fit_score) && (
                                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs">
                                                    Tech: {discovery.technical_fit_score || '-'}/10 | Biz: {discovery.business_fit_score || '-'}/10
                                                </span>
                                            )}
                                        </div>
                                        {discovery.summary && (
                                            <p className="mt-2 text-sm text-slate-500 line-clamp-2">{discovery.summary}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        <button
                                            onClick={() => handleEdit(discovery)}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(discovery.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-900">
                                {editingDiscovery ? 'Edit Discovery' : 'New Technical Discovery'}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    resetForm();
                                }}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-8">
                            {/* Basic Info */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Basic Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            placeholder="e.g., Technical Discovery - Acme Corp ERP Integration"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value as DiscoveryStatus })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="draft">Draft</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                            <option value="archived">Archived</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Discovery Date</label>
                                        <input
                                            type="date"
                                            value={formData.discovery_date}
                                            onChange={(e) => setFormData({ ...formData, discovery_date: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Linked Opportunity</label>
                                        <select
                                            value={formData.opportunity_id}
                                            onChange={(e) => setFormData({ ...formData, opportunity_id: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="">Select opportunity...</option>
                                            {opportunities.map((opp) => (
                                                <option key={opp.id} value={opp.id}>
                                                    {opp.name} {opp.customer ? `(${opp.customer.company_name})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Business Context */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <Building className="w-4 h-4" />
                                    Business Context
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Current Solution</label>
                                        <textarea
                                            value={formData.current_solution}
                                            onChange={(e) => setFormData({ ...formData, current_solution: e.target.value })}
                                            rows={2}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            placeholder="What solution is the customer currently using?"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Pain Points</label>
                                        <textarea
                                            value={formData.pain_points}
                                            onChange={(e) => setFormData({ ...formData, pain_points: e.target.value })}
                                            rows={2}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            placeholder="What challenges are they facing?"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Desired Outcomes</label>
                                        <textarea
                                            value={formData.desired_outcomes}
                                            onChange={(e) => setFormData({ ...formData, desired_outcomes: e.target.value })}
                                            rows={2}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            placeholder="What does success look like for them?"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Success Criteria</label>
                                        <textarea
                                            value={formData.success_criteria}
                                            onChange={(e) => setFormData({ ...formData, success_criteria: e.target.value })}
                                            rows={2}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            placeholder="How will they measure success?"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Timeline & Budget */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Timeline & Budget
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Decision Timeline</label>
                                        <select
                                            value={formData.decision_timeline}
                                            onChange={(e) => setFormData({ ...formData, decision_timeline: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="">Select timeline...</option>
                                            {TIMELINE_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Budget Range</label>
                                        <select
                                            value={formData.budget_range}
                                            onChange={(e) => setFormData({ ...formData, budget_range: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="">Select budget...</option>
                                            {BUDGET_OPTIONS.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Scoring */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <Target className="w-4 h-4" />
                                    Qualification Scoring
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Technical Fit (1-10)</label>
                                        <input
                                            type="number"
                                            value={formData.technical_fit_score || ''}
                                            onChange={(e) => setFormData({ ...formData, technical_fit_score: e.target.value ? parseInt(e.target.value) : null })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            min="1"
                                            max="10"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Business Fit (1-10)</label>
                                        <input
                                            type="number"
                                            value={formData.business_fit_score || ''}
                                            onChange={(e) => setFormData({ ...formData, business_fit_score: e.target.value ? parseInt(e.target.value) : null })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            min="1"
                                            max="10"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Summary & Next Steps */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Summary & Follow-up
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Summary</label>
                                        <textarea
                                            value={formData.summary}
                                            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                                            rows={3}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            placeholder="High-level summary of the discovery..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Next Steps</label>
                                        <textarea
                                            value={formData.next_steps}
                                            onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })}
                                            rows={2}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Action items and follow-ups..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Risks & Concerns</label>
                                        <textarea
                                            value={formData.risks_and_concerns}
                                            onChange={(e) => setFormData({ ...formData, risks_and_concerns: e.target.value })}
                                            rows={2}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Any blockers or concerns?"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-200">
                                <button
                                    type="submit"
                                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                    {editingDiscovery ? 'Update Discovery' : 'Save Discovery'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors"
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
