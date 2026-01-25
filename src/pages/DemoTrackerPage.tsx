import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    Presentation,
    Plus,
    Calendar,
    Clock,
    CheckCircle,
    Edit2,
    Trash2,
    Target,
    Search,
    Filter,
    X,
    Save,
} from 'lucide-react';

type DemoType = 'product_demo' | 'poc' | 'trial' | 'technical_deep_dive' | 'workshop';
type DemoStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';
type DemoOutcome = 'positive' | 'neutral' | 'negative' | 'pending';

interface Demo {
    id: string;
    title: string;
    demo_type: DemoType;
    status: DemoStatus;
    outcome: DemoOutcome;
    opportunity_id: string | null;
    lead_id: string | null;
    customer_id: string | null;
    conducted_by: string | null;
    scheduled_at: string;
    duration_minutes: number;
    completed_at: string | null;
    description: string | null;
    customer_feedback: string | null;
    internal_notes: string | null;
    next_steps: string | null;
    technical_score: number | null;
    business_score: number | null;
    created_at: string;
    // Joined data
    opportunity?: { name: string } | null;
    customer?: { company_name: string } | null;
    conductor?: { full_name: string } | null;
}

interface FormData {
    title: string;
    demo_type: DemoType;
    status: DemoStatus;
    outcome: DemoOutcome;
    opportunity_id: string;
    scheduled_at: string;
    scheduled_time: string;
    duration_minutes: number;
    description: string;
    customer_feedback: string;
    internal_notes: string;
    next_steps: string;
    technical_score: number | null;
    business_score: number | null;
}

const DEMO_TYPE_LABELS: Record<DemoType, string> = {
    product_demo: 'Product Demo',
    poc: 'Proof of Concept',
    trial: 'Trial',
    technical_deep_dive: 'Technical Deep Dive',
    workshop: 'Workshop',
};

const STATUS_COLORS: Record<DemoStatus, string> = {
    scheduled: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
    rescheduled: 'bg-amber-100 text-amber-700',
    no_show: 'bg-slate-100 text-slate-700',
};

const OUTCOME_COLORS: Record<DemoOutcome, string> = {
    positive: 'bg-emerald-100 text-emerald-700',
    neutral: 'bg-slate-100 text-slate-700',
    negative: 'bg-red-100 text-red-700',
    pending: 'bg-blue-100 text-blue-700',
};

export default function DemoTrackerPage() {
    const { profile } = useAuth();
    const [demos, setDemos] = useState<Demo[]>([]);
    const [opportunities, setOpportunities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingDemo, setEditingDemo] = useState<Demo | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<DemoStatus | 'all'>('all');

    const [formData, setFormData] = useState<FormData>({
        title: '',
        demo_type: 'product_demo',
        status: 'scheduled',
        outcome: 'pending',
        opportunity_id: '',
        scheduled_at: '',
        scheduled_time: '10:00',
        duration_minutes: 60,
        description: '',
        customer_feedback: '',
        internal_notes: '',
        next_steps: '',
        technical_score: null,
        business_score: null,
    });

    useEffect(() => {
        loadDemos();
        loadOpportunities();
    }, []);

    const loadDemos = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('demos')
                .select(`
          *,
          opportunity:crm_opportunities(name),
          customer:customers(company_name),
          conductor:profiles!demos_conducted_by_fkey(full_name)
        `)
                .order('scheduled_at', { ascending: false });

            if (error) throw error;
            setDemos((data as any) || []);
        } catch (error) {
            console.error('Error loading demos:', error);
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

        if (!formData.title || !formData.scheduled_at) {
            alert('Please fill in required fields');
            return;
        }

        try {
            const scheduledDateTime = new Date(`${formData.scheduled_at}T${formData.scheduled_time}`);

            const demoData = {
                title: formData.title,
                demo_type: formData.demo_type,
                status: formData.status,
                outcome: formData.outcome,
                opportunity_id: formData.opportunity_id || null,
                scheduled_at: scheduledDateTime.toISOString(),
                duration_minutes: formData.duration_minutes,
                description: formData.description || null,
                customer_feedback: formData.customer_feedback || null,
                internal_notes: formData.internal_notes || null,
                next_steps: formData.next_steps || null,
                technical_score: formData.technical_score,
                business_score: formData.business_score,
                conducted_by: profile?.id,
                completed_at: formData.status === 'completed' ? new Date().toISOString() : null,
            };

            if (editingDemo) {
                const { error } = await supabase
                    .from('demos')
                    .update(demoData as any)
                    .eq('id', editingDemo.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('demos')
                    .insert({ ...demoData, created_by: profile?.id } as any);
                if (error) throw error;
            }

            setShowModal(false);
            resetForm();
            loadDemos();
        } catch (error: any) {
            console.error('Error saving demo:', error);
            alert('Failed to save demo: ' + error.message);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            demo_type: 'product_demo',
            status: 'scheduled',
            outcome: 'pending',
            opportunity_id: '',
            scheduled_at: '',
            scheduled_time: '10:00',
            duration_minutes: 60,
            description: '',
            customer_feedback: '',
            internal_notes: '',
            next_steps: '',
            technical_score: null,
            business_score: null,
        });
        setEditingDemo(null);
    };

    const handleEdit = (demo: Demo) => {
        const date = new Date(demo.scheduled_at);
        setEditingDemo(demo);
        setFormData({
            title: demo.title,
            demo_type: demo.demo_type,
            status: demo.status,
            outcome: demo.outcome,
            opportunity_id: demo.opportunity_id || '',
            scheduled_at: date.toISOString().split('T')[0],
            scheduled_time: date.toTimeString().slice(0, 5),
            duration_minutes: demo.duration_minutes,
            description: demo.description || '',
            customer_feedback: demo.customer_feedback || '',
            internal_notes: demo.internal_notes || '',
            next_steps: demo.next_steps || '',
            technical_score: demo.technical_score,
            business_score: demo.business_score,
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this demo?')) return;

        try {
            const { error } = await supabase.from('demos').delete().eq('id', id);
            if (error) throw error;
            loadDemos();
        } catch (error: any) {
            alert('Failed to delete demo: ' + error.message);
        }
    };

    const filteredDemos = demos.filter((demo) => {
        const matchesSearch =
            demo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            demo.opportunity?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            demo.customer?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || demo.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const stats = {
        total: demos.length,
        scheduled: demos.filter((d) => d.status === 'scheduled').length,
        completed: demos.filter((d) => d.status === 'completed').length,
        positive: demos.filter((d) => d.outcome === 'positive').length,
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
                    <h1 className="text-2xl font-bold text-slate-900">Demo & POC Tracker</h1>
                    <p className="text-slate-600 mt-1">Schedule and track product demonstrations</p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Schedule Demo
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Total Demos</p>
                            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                        </div>
                        <Presentation className="w-8 h-8 text-indigo-500" />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Upcoming</p>
                            <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
                        </div>
                        <Calendar className="w-8 h-8 text-blue-500" />
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
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600">Positive Outcome</p>
                            <p className="text-2xl font-bold text-emerald-600">{stats.positive}</p>
                        </div>
                        <Target className="w-8 h-8 text-emerald-500" />
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
                            placeholder="Search demos..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-slate-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as DemoStatus | 'all')}
                            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">All Status</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="rescheduled">Rescheduled</option>
                            <option value="no_show">No Show</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Demos List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                {filteredDemos.length === 0 ? (
                    <div className="p-12 text-center">
                        <Presentation className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-2">No demos found</h3>
                        <p className="text-slate-500 mb-4">Get started by scheduling your first demo</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            <Plus className="w-4 h-4" />
                            Schedule Demo
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredDemos.map((demo) => (
                            <div key={demo.id} className="p-4 hover:bg-slate-50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold text-slate-900 truncate">{demo.title}</h3>
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[demo.status]}`}
                                            >
                                                {demo.status.replace('_', ' ')}
                                            </span>
                                            {demo.outcome !== 'pending' && (
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${OUTCOME_COLORS[demo.outcome]}`}
                                                >
                                                    {demo.outcome}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                {new Date(demo.scheduled_at).toLocaleDateString()}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                {new Date(demo.scheduled_at).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                            <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">
                                                {DEMO_TYPE_LABELS[demo.demo_type]}
                                            </span>
                                            {demo.opportunity && (
                                                <span className="flex items-center gap-1">
                                                    <Target className="w-4 h-4" />
                                                    {demo.opportunity.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        <button
                                            onClick={() => handleEdit(demo)}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(demo.id)}
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
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-900">
                                {editingDemo ? 'Edit Demo' : 'Schedule New Demo'}
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

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        placeholder="e.g., Product Demo for Acme Corp"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Demo Type</label>
                                    <select
                                        value={formData.demo_type}
                                        onChange={(e) => setFormData({ ...formData, demo_type: e.target.value as DemoType })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {Object.entries(DEMO_TYPE_LABELS).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Opportunity</label>
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

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                                    <input
                                        type="date"
                                        value={formData.scheduled_at}
                                        onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                                    <input
                                        type="time"
                                        value={formData.scheduled_time}
                                        onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes)</label>
                                    <input
                                        type="number"
                                        value={formData.duration_minutes}
                                        onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        min="15"
                                        step="15"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as DemoStatus })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="scheduled">Scheduled</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                        <option value="rescheduled">Rescheduled</option>
                                        <option value="no_show">No Show</option>
                                    </select>
                                </div>

                                {formData.status === 'completed' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Outcome</label>
                                            <select
                                                value={formData.outcome}
                                                onChange={(e) => setFormData({ ...formData, outcome: e.target.value as DemoOutcome })}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="positive">Positive</option>
                                                <option value="neutral">Neutral</option>
                                                <option value="negative">Negative</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Technical Score (1-5)</label>
                                            <input
                                                type="number"
                                                value={formData.technical_score || ''}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, technical_score: e.target.value ? parseInt(e.target.value) : null })
                                                }
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                min="1"
                                                max="5"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Business Score (1-5)</label>
                                            <input
                                                type="number"
                                                value={formData.business_score || ''}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, business_score: e.target.value ? parseInt(e.target.value) : null })
                                                }
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                min="1"
                                                max="5"
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Demo objectives and key topics..."
                                    />
                                </div>

                                {formData.status === 'completed' && (
                                    <>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Customer Feedback</label>
                                            <textarea
                                                value={formData.customer_feedback}
                                                onChange={(e) => setFormData({ ...formData, customer_feedback: e.target.value })}
                                                rows={2}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                placeholder="What did the customer say?"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Next Steps</label>
                                            <textarea
                                                value={formData.next_steps}
                                                onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })}
                                                rows={2}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                placeholder="Action items and follow-ups..."
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Internal Notes</label>
                                    <textarea
                                        value={formData.internal_notes}
                                        onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Notes for the team..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-200">
                                <button
                                    type="submit"
                                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                    {editingDemo ? 'Update Demo' : 'Schedule Demo'}
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
