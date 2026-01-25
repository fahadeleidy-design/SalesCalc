import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    Activity,
    Plus,
    Clock,
    Target,
    Search,
    Filter,
    X,
    Save,
    Phone,
    Presentation,
    MessageSquare,
    FileCheck,
    Users,
    Edit2,
    Trash2,
} from 'lucide-react';

type ActivityType =
    | 'demo'
    | 'discovery_call'
    | 'technical_qa'
    | 'proposal_review'
    | 'poc_session'
    | 'follow_up'
    | 'internal_meeting'
    | 'training'
    | 'other';

interface PresalesActivity {
    id: string;
    activity_type: ActivityType;
    title: string;
    description: string | null;
    activity_date: string;
    duration_minutes: number | null;
    opportunity_id: string | null;
    outcome: string | null;
    next_steps: string | null;
    created_at: string;
    opportunity?: { name: string; customer?: { company_name: string } } | null;
}

interface FormData {
    activity_type: ActivityType;
    title: string;
    description: string;
    activity_date: string;
    activity_time: string;
    duration_minutes: number;
    opportunity_id: string;
    outcome: string;
    next_steps: string;
}

const ACTIVITY_TYPE_CONFIG: Record<ActivityType, { label: string; icon: React.ElementType; color: string }> = {
    demo: { label: 'Demo', icon: Presentation, color: 'bg-indigo-100 text-indigo-700' },
    discovery_call: { label: 'Discovery Call', icon: Phone, color: 'bg-blue-100 text-blue-700' },
    technical_qa: { label: 'Technical Q&A', icon: MessageSquare, color: 'bg-purple-100 text-purple-700' },
    proposal_review: { label: 'Proposal Review', icon: FileCheck, color: 'bg-amber-100 text-amber-700' },
    poc_session: { label: 'POC Session', icon: Target, color: 'bg-emerald-100 text-emerald-700' },
    follow_up: { label: 'Follow Up', icon: Phone, color: 'bg-cyan-100 text-cyan-700' },
    internal_meeting: { label: 'Internal Meeting', icon: Users, color: 'bg-slate-100 text-slate-700' },
    training: { label: 'Training', icon: Activity, color: 'bg-orange-100 text-orange-700' },
    other: { label: 'Other', icon: Activity, color: 'bg-gray-100 text-gray-700' },
};

export default function PresalesActivityLogPage() {
    const { profile } = useAuth();
    const [activities, setActivities] = useState<PresalesActivity[]>([]);
    const [opportunities, setOpportunities] = useState<{ id: string; name: string; customer?: { company_name: string } }[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingActivity, setEditingActivity] = useState<PresalesActivity | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all');

    const now = new Date();
    const [formData, setFormData] = useState<FormData>({
        activity_type: 'demo',
        title: '',
        description: '',
        activity_date: now.toISOString().split('T')[0],
        activity_time: now.toTimeString().slice(0, 5),
        duration_minutes: 60,
        opportunity_id: '',
        outcome: '',
        next_steps: '',
    });

    useEffect(() => {
        loadActivities();
        loadOpportunities();
    }, []);

    const loadActivities = async () => {
        setLoading(true);
        try {
            const { data, error } = await (supabase as any)
                .from('presales_activities')
                .select('*, opportunity:crm_opportunities(name, customer:customers(company_name))')
                .order('activity_date', { ascending: false });

            if (error) throw error;
            setActivities(data || []);
        } catch (error) {
            console.error('Error loading activities:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadOpportunities = async () => {
        const { data } = await supabase
            .from('crm_opportunities')
            .select('id, name, customer:customers(company_name)')
            .order('name');
        setOpportunities((data as any) || []);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title) {
            alert('Please enter a title');
            return;
        }

        try {
            const activityDateTime = new Date(`${formData.activity_date}T${formData.activity_time}`);
            const activityData = {
                activity_type: formData.activity_type,
                title: formData.title,
                description: formData.description || null,
                activity_date: activityDateTime.toISOString(),
                duration_minutes: formData.duration_minutes || null,
                opportunity_id: formData.opportunity_id || null,
                outcome: formData.outcome || null,
                next_steps: formData.next_steps || null,
                performed_by: profile?.id,
            };

            if (editingActivity) {
                const { error } = await (supabase as any)
                    .from('presales_activities')
                    .update(activityData)
                    .eq('id', editingActivity.id);
                if (error) throw error;
            } else {
                const { error } = await (supabase as any)
                    .from('presales_activities')
                    .insert({ ...activityData, created_by: profile?.id });
                if (error) throw error;
            }

            setShowModal(false);
            resetForm();
            loadActivities();
        } catch (error: any) {
            console.error('Error saving activity:', error);
            alert('Failed to save activity: ' + error.message);
        }
    };

    const resetForm = () => {
        const now = new Date();
        setFormData({
            activity_type: 'demo',
            title: '',
            description: '',
            activity_date: now.toISOString().split('T')[0],
            activity_time: now.toTimeString().slice(0, 5),
            duration_minutes: 60,
            opportunity_id: '',
            outcome: '',
            next_steps: '',
        });
        setEditingActivity(null);
    };

    const handleEdit = (activity: PresalesActivity) => {
        const date = new Date(activity.activity_date);
        setEditingActivity(activity);
        setFormData({
            activity_type: activity.activity_type,
            title: activity.title,
            description: activity.description || '',
            activity_date: date.toISOString().split('T')[0],
            activity_time: date.toTimeString().slice(0, 5),
            duration_minutes: activity.duration_minutes || 60,
            opportunity_id: activity.opportunity_id || '',
            outcome: activity.outcome || '',
            next_steps: activity.next_steps || '',
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this activity?')) return;
        try {
            const { error } = await (supabase as any).from('presales_activities').delete().eq('id', id);
            if (error) throw error;
            loadActivities();
        } catch (error: any) {
            alert('Failed to delete activity: ' + error.message);
        }
    };

    const filteredActivities = activities.filter((activity) => {
        const matchesSearch =
            activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            activity.opportunity?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'all' || activity.activity_type === typeFilter;
        return matchesSearch && matchesType;
    });

    const groupedActivities = filteredActivities.reduce((groups, activity) => {
        const date = new Date(activity.activity_date).toLocaleDateString();
        if (!groups[date]) groups[date] = [];
        groups[date].push(activity);
        return groups;
    }, {} as Record<string, PresalesActivity[]>);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Activity Log</h1>
                    <p className="text-slate-600 mt-1">Track all presales activities and engagements</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Log Activity
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <p className="text-sm text-slate-600">This Week</p>
                    <p className="text-2xl font-bold text-slate-900">
                        {activities.filter((a) => {
                            const actDate = new Date(a.activity_date);
                            const weekAgo = new Date();
                            weekAgo.setDate(weekAgo.getDate() - 7);
                            return actDate >= weekAgo;
                        }).length}
                    </p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <p className="text-sm text-slate-600">Demos</p>
                    <p className="text-2xl font-bold text-indigo-600">
                        {activities.filter((a) => a.activity_type === 'demo').length}
                    </p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <p className="text-sm text-slate-600">Discovery Calls</p>
                    <p className="text-2xl font-bold text-blue-600">
                        {activities.filter((a) => a.activity_type === 'discovery_call').length}
                    </p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <p className="text-sm text-slate-600">Total Activities</p>
                    <p className="text-2xl font-bold text-slate-900">{activities.length}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search activities..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-slate-400" />
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as ActivityType | 'all')}
                            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">All Types</option>
                            {Object.entries(ACTIVITY_TYPE_CONFIG).map(([value, config]) => (
                                <option key={value} value={value}>{config.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                {Object.keys(groupedActivities).length === 0 ? (
                    <div className="p-12 text-center">
                        <Activity className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-2">No activities found</h3>
                        <p className="text-slate-500 mb-4">Start by logging your first presales activity</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            <Plus className="w-4 h-4" />
                            Log Activity
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {Object.entries(groupedActivities).map(([date, dayActivities]) => (
                            <div key={date}>
                                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                                    <p className="text-sm font-medium text-slate-600">{date}</p>
                                </div>
                                {dayActivities.map((activity) => {
                                    const config = ACTIVITY_TYPE_CONFIG[activity.activity_type];
                                    const IconComponent = config.icon;
                                    return (
                                        <div key={activity.id} className="p-4 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-start gap-4">
                                                <div className={`p-2 rounded-lg ${config.color}`}>
                                                    <IconComponent className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h3 className="font-semibold text-slate-900">{activity.title}</h3>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                                                            {config.label}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-4 h-4" />
                                                            {new Date(activity.activity_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {activity.duration_minutes && <span>{activity.duration_minutes} min</span>}
                                                        {activity.opportunity && (
                                                            <span className="flex items-center gap-1">
                                                                <Target className="w-4 h-4" />
                                                                {activity.opportunity.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {activity.description && (
                                                        <p className="mt-2 text-sm text-slate-500 line-clamp-2">{activity.description}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEdit(activity)}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(activity.id)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-900">
                                {editingActivity ? 'Edit Activity' : 'Log New Activity'}
                            </h2>
                            <button onClick={() => { setShowModal(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Activity Type</label>
                                    <select
                                        value={formData.activity_type}
                                        onChange={(e) => setFormData({ ...formData, activity_type: e.target.value as ActivityType })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {Object.entries(ACTIVITY_TYPE_CONFIG).map(([value, config]) => (
                                            <option key={value} value={value}>{config.label}</option>
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

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        placeholder="e.g., Product demo for Acme Corp"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={formData.activity_date}
                                        onChange={(e) => setFormData({ ...formData, activity_date: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                                    <input
                                        type="time"
                                        value={formData.activity_time}
                                        onChange={(e) => setFormData({ ...formData, activity_time: e.target.value })}
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
                                        min="5"
                                        step="5"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        placeholder="What happened during this activity?"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Outcome</label>
                                    <textarea
                                        value={formData.outcome}
                                        onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        placeholder="What was the result?"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Next Steps</label>
                                    <textarea
                                        value={formData.next_steps}
                                        onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        placeholder="What needs to happen next?"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-200">
                                <button
                                    type="submit"
                                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                    {editingActivity ? 'Update Activity' : 'Log Activity'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); resetForm(); }}
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
