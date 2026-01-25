import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import {
    LifeBuoy,
    Plus,
    Search,
    Layout,
    List,
    User,
    ArrowRight,
    Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Ticket {
    id: string;
    ticket_number: string;
    subject: string;
    description: string;
    status: 'new' | 'open' | 'pending' | 'solved' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    account_id: string;
    account?: { name: string };
    assigned_to?: { full_name: string };
    created_at: string;
}

export default function ServiceDeskView() {
    const queryClient = useQueryClient();
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
    const [searchTerm, setSearchTerm] = useState('');

    const { data: tickets, isLoading } = useQuery({
        queryKey: ['crm-tickets'],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from('crm_tickets')
                .select('*, account:crm_accounts(name), assignee:profiles!assigned_to(full_name)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as Ticket[];
        },
    });

    const columns = [
        { id: 'new', label: 'New', color: 'bg-blue-600' },
        { id: 'open', label: 'Open', color: 'bg-orange-600' },
        { id: 'pending', label: 'Pending', color: 'bg-amber-600' },
        { id: 'solved', label: 'Solved', color: 'bg-green-600' },
    ] as const;

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const { error } = await (supabase as any).from('crm_tickets').update({ status }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-tickets'] });
            toast.success('Ticket status updated');
        },
    });

    const filteredTickets = tickets?.filter(t =>
        t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.ticket_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 font-inter">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                    <div className="bg-orange-100 p-3 rounded-xl shadow-inner">
                        <LifeBuoy className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Service Desk</h2>
                        <p className="text-sm text-slate-500 font-medium">Post-sale customer success & support</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Layout className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <List className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search tickets..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-medium text-sm"
                        />
                    </div>

                    <button className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/30">
                        <Plus className="h-5 w-5" />
                        New Ticket
                    </button>
                </div>
            </div>

            {viewMode === 'kanban' ? (
                <div className="flex gap-6 overflow-x-auto pb-4 h-[calc(100vh-320px)] min-h-[500px]">
                    {columns.map((column) => (
                        <div key={column.id} className="w-80 flex-shrink-0 flex flex-col">
                            <div className="flex items-center justify-between mb-4 px-2">
                                <div className="flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full ${column.color}`} />
                                    <h3 className="font-bold text-slate-700 uppercase tracking-widest text-xs">{column.label}</h3>
                                    <span className="bg-slate-100 text-slate-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                                        {filteredTickets?.filter(t => t.status === column.id).length || 0}
                                    </span>
                                </div>
                            </div>

                            <div className="flex-1 bg-slate-50/50 rounded-2xl border border-slate-100 p-3 space-y-4 overflow-y-auto">
                                {filteredTickets?.filter(t => t.status === column.id).map((ticket) => (
                                    <div key={ticket.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group cursor-grab active:cursor-grabbing">
                                        <div className="flex items-start justify-between mb-3">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                {ticket.ticket_number}
                                            </span>
                                            <div className={`h-1.5 w-6 rounded-full ${ticket.priority === 'urgent' ? 'bg-red-500' :
                                                ticket.priority === 'high' ? 'bg-orange-500' :
                                                    'bg-slate-300'
                                                }`} title={ticket.priority} />
                                        </div>

                                        <h4 className="text-sm font-bold text-slate-900 mb-2 line-clamp-2 leading-tight">
                                            {ticket.subject}
                                        </h4>

                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="h-5 w-5 rounded bg-slate-100 flex items-center justify-center border border-slate-200">
                                                <User className="h-3 w-3 text-slate-400" />
                                            </div>
                                            <span className="text-[11px] font-bold text-slate-500">{ticket.account?.name || 'Unknown'}</span>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                                                <Clock className="h-3 w-3" />
                                                {format(new Date(ticket.created_at), 'MMM d')}
                                            </div>
                                            <div className="h-6 w-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center overflow-hidden">
                                                <span className="text-[8px] font-black text-slate-400">
                                                    {ticket.assigned_to ? 'AV' : '?'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Ticket</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Priority</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Account</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Created</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTickets?.map((ticket) => (
                                <tr key={ticket.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase mb-0.5 block">{ticket.ticket_number}</span>
                                            <p className="text-sm font-bold text-slate-900">{ticket.subject}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${ticket.priority === 'urgent' ? 'bg-red-100 text-red-600 border border-red-200' :
                                            ticket.priority === 'high' ? 'bg-orange-100 text-orange-600 border border-orange-200' :
                                                'bg-slate-100 text-slate-600 border border-slate-200'
                                            }`}>
                                            {ticket.priority}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`h-2 w-2 rounded-full ${ticket.status === 'new' ? 'bg-blue-600' :
                                                ticket.status === 'open' ? 'bg-orange-600' :
                                                    ticket.status === 'pending' ? 'bg-amber-600' :
                                                        'bg-green-600'
                                                }`} />
                                            <span className="text-sm font-bold text-slate-700 capitalize">{ticket.status}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-600">
                                        {ticket.account?.name}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-400">
                                        {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                            <ArrowRight className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
