import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    Calendar,
    Clock,
    Plus,
    User,
    Users,
    ChevronLeft,
    ChevronRight,
    X,
    Save,
    Filter,
} from 'lucide-react';

interface Profile {
    id: string;
    full_name: string;
    role: string;
}

interface Booking {
    id: string;
    resource_id: string;
    booked_by: string;
    title: string;
    booking_type: string;
    scheduled_start: string;
    scheduled_end: string;
    status: string;
    resource?: Profile;
    opportunity?: { name: string } | null;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);

const BOOKING_TYPES = [
    { value: 'demo', label: 'Demo', color: 'bg-indigo-500' },
    { value: 'poc', label: 'POC Session', color: 'bg-emerald-500' },
    { value: 'call', label: 'Call', color: 'bg-blue-500' },
    { value: 'training', label: 'Training', color: 'bg-amber-500' },
    { value: 'internal', label: 'Internal', color: 'bg-slate-500' },
];

export default function ResourceSchedulingPage() {
    const { profile } = useAuth();
    const [resources, setResources] = useState<Profile[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [opportunities, setOpportunities] = useState<{ id: string; name: string }[]>([]);
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day;
        return new Date(now.setDate(diff));
    });
    const [loading, setLoading] = useState(true);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [filterRole, setFilterRole] = useState<string>('all');

    const [bookingForm, setBookingForm] = useState({
        resource_id: '',
        title: '',
        booking_type: 'demo',
        opportunity_id: '',
        scheduled_start: '',
        scheduled_end: '',
        notes: '',
    });

    useEffect(() => {
        loadResources();
        loadOpportunities();
    }, []);

    useEffect(() => {
        loadBookings();
    }, [currentWeekStart]);

    const loadResources = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .in('role', ['solution_consultant', 'sales', 'engineering'])
            .order('full_name');
        setResources(data || []);
    };

    const loadBookings = async () => {
        setLoading(true);
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const { data, error } = await (supabase as any)
            .from('resource_bookings')
            .select('*, resource:profiles!resource_id(id, full_name, role), opportunity:crm_opportunities(name)')
            .gte('scheduled_start', currentWeekStart.toISOString())
            .lt('scheduled_start', weekEnd.toISOString())
            .order('scheduled_start');

        if (!error) setBookings(data || []);
        setLoading(false);
    };

    const loadOpportunities = async () => {
        const { data } = await supabase.from('crm_opportunities').select('id, name').order('name');
        setOpportunities(data || []);
    };

    const handleSlotClick = (date: Date, hour: number) => {
        const start = new Date(date);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(start);
        end.setHours(hour + 1);

        setBookingForm({
            ...bookingForm,
            scheduled_start: start.toISOString().slice(0, 16),
            scheduled_end: end.toISOString().slice(0, 16),
        });
        setShowBookingModal(true);
    };

    const handleCreateBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bookingForm.resource_id || !bookingForm.title) {
            alert('Please fill in required fields');
            return;
        }

        try {
            const { error } = await (supabase as any).from('resource_bookings').insert({
                resource_id: bookingForm.resource_id,
                booked_by: profile?.id,
                title: bookingForm.title,
                booking_type: bookingForm.booking_type,
                opportunity_id: bookingForm.opportunity_id || null,
                scheduled_start: bookingForm.scheduled_start,
                scheduled_end: bookingForm.scheduled_end,
                notes: bookingForm.notes || null,
                status: 'pending',
            });

            if (error) throw error;

            setShowBookingModal(false);
            setBookingForm({
                resource_id: '',
                title: '',
                booking_type: 'demo',
                opportunity_id: '',
                scheduled_start: '',
                scheduled_end: '',
                notes: '',
            });
            loadBookings();
        } catch (error: any) {
            alert('Failed to create booking: ' + error.message);
        }
    };

    const navigateWeek = (direction: number) => {
        const newStart = new Date(currentWeekStart);
        newStart.setDate(newStart.getDate() + direction * 7);
        setCurrentWeekStart(newStart);
    };

    const getWeekDates = () => {
        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(currentWeekStart);
            date.setDate(date.getDate() + i);
            return date;
        });
    };

    const getBookingsForSlot = (date: Date, hour: number) => {
        return bookings.filter((b) => {
            const start = new Date(b.scheduled_start);
            return start.toDateString() === date.toDateString() && start.getHours() === hour;
        });
    };

    const filteredResources = filterRole === 'all' ? resources : resources.filter(r => r.role === filterRole);
    const weekDates = getWeekDates();

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
                    <h1 className="text-2xl font-bold text-slate-900">Resource Scheduling</h1>
                    <p className="text-slate-600 mt-1">Book Solution Consultants for demos, POCs, and calls</p>
                </div>
                <button
                    onClick={() => setShowBookingModal(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                    <Plus className="w-5 h-5" />
                    New Booking
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigateWeek(-1)} className="p-2 hover:bg-slate-100 rounded-lg">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="text-center">
                            <p className="font-semibold text-slate-900">
                                {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
                                {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                        </div>
                        <button onClick={() => navigateWeek(1)} className="p-2 hover:bg-slate-100 rounded-lg">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setCurrentWeekStart(new Date(new Date().setDate(new Date().getDate() - new Date().getDay())))}
                            className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg font-medium"
                        >
                            Today
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                        >
                            <option value="all">All Roles</option>
                            <option value="solution_consultant">Solution Consultants</option>
                            <option value="sales">Sales</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="p-3 text-left text-sm font-medium text-slate-600 border-b border-r border-slate-200 w-24">
                                    <Clock className="w-4 h-4 inline mr-1" />Time
                                </th>
                                {weekDates.map((date, i) => (
                                    <th
                                        key={i}
                                        className={`p-3 text-center text-sm font-medium border-b border-r border-slate-200 ${date.toDateString() === new Date().toDateString() ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
                                            }`}
                                    >
                                        <div>{DAYS[date.getDay()].slice(0, 3)}</div>
                                        <div className="text-lg font-semibold">{date.getDate()}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {HOURS.map((hour) => (
                                <tr key={hour} className="border-b border-slate-100">
                                    <td className="p-2 text-sm text-slate-500 border-r border-slate-200 bg-slate-50">
                                        {hour % 12 || 12}:00 {hour < 12 ? 'AM' : 'PM'}
                                    </td>
                                    {weekDates.map((date, dayIndex) => {
                                        const slotBookings = getBookingsForSlot(date, hour);
                                        return (
                                            <td
                                                key={dayIndex}
                                                onClick={() => handleSlotClick(date, hour)}
                                                className="p-1 border-r border-slate-100 min-h-[60px] hover:bg-indigo-50 cursor-pointer"
                                            >
                                                {slotBookings.map((booking) => {
                                                    const typeConfig = BOOKING_TYPES.find((t) => t.value === booking.booking_type);
                                                    return (
                                                        <div
                                                            key={booking.id}
                                                            className={`${typeConfig?.color || 'bg-slate-500'} text-white text-xs p-1.5 rounded mb-1 truncate`}
                                                        >
                                                            <div className="font-medium truncate">{booking.title}</div>
                                                            <div className="opacity-80 truncate">{booking.resource?.full_name}</div>
                                                        </div>
                                                    );
                                                })}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    Team Members ({filteredResources.length})
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {filteredResources.map((resource) => (
                        <div key={resource.id} className="p-3 border border-slate-200 rounded-lg hover:border-indigo-300">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-indigo-600" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-medium text-slate-900 truncate">{resource.full_name}</p>
                                    <p className="text-xs text-slate-500 capitalize">{resource.role.replace('_', ' ')}</p>
                                </div>
                            </div>
                            <div className="text-xs text-slate-600">
                                <span className="font-medium">{bookings.filter(b => b.resource_id === resource.id).length}</span> bookings
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {showBookingModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
                        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-indigo-600" />
                                New Booking
                            </h2>
                            <button onClick={() => setShowBookingModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateBooking} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Resource *</label>
                                <select
                                    value={bookingForm.resource_id}
                                    onChange={(e) => setBookingForm({ ...bookingForm, resource_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                    required
                                >
                                    <option value="">Select team member...</option>
                                    {resources.map((r) => (
                                        <option key={r.id} value={r.id}>{r.full_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                                <input
                                    type="text"
                                    value={bookingForm.title}
                                    onChange={(e) => setBookingForm({ ...bookingForm, title: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                                    <select
                                        value={bookingForm.booking_type}
                                        onChange={(e) => setBookingForm({ ...bookingForm, booking_type: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                    >
                                        {BOOKING_TYPES.map((t) => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Opportunity</label>
                                    <select
                                        value={bookingForm.opportunity_id}
                                        onChange={(e) => setBookingForm({ ...bookingForm, opportunity_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                    >
                                        <option value="">None</option>
                                        {opportunities.map((o) => (
                                            <option key={o.id} value={o.id}>{o.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Start</label>
                                    <input
                                        type="datetime-local"
                                        value={bookingForm.scheduled_start}
                                        onChange={(e) => setBookingForm({ ...bookingForm, scheduled_start: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">End</label>
                                    <input
                                        type="datetime-local"
                                        value={bookingForm.scheduled_end}
                                        onChange={(e) => setBookingForm({ ...bookingForm, scheduled_end: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-200">
                                <button
                                    type="submit"
                                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium"
                                >
                                    <Save className="w-4 h-4" />
                                    Create Booking
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowBookingModal(false)}
                                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
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
