import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import {
    History as HistoryIcon,
    Clock,
    User,
    ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';

interface AuditLogEntry {
    id: string;
    entity_type: string;
    entity_id: string;
    field_name: string;
    old_value: any;
    new_value: any;
    changed_by: string;
    changed_at: string;
    profiles?: {
        full_name: string;
    };
}

interface AuditLogViewerProps {
    entityType: 'lead' | 'account' | 'contact' | 'opportunity';
    entityId: string;
}

export default function AuditLogViewer({ entityType, entityId }: AuditLogViewerProps) {
    const { data: logs, isLoading } = useQuery({
        queryKey: ['crm-audit-logs', entityType, entityId],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from('crm_audit_log')
                .select('*, profiles:changed_by(full_name)')
                .eq('entity_type', entityType)
                .eq('entity_id', entityId)
                .order('changed_at', { ascending: false });

            if (error) throw error;
            return data as AuditLogEntry[];
        },
    });

    if (isLoading) {
        return (
            <div className="space-y-4 animate-pulse">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-slate-100 rounded-xl border border-slate-200" />
                ))}
            </div>
        );
    }

    if (!logs || logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                    <HistoryIcon className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No Change History</h3>
                <p className="text-sm text-slate-500 max-w-xs mt-1">
                    Every field update for this {entityType} will be automatically tracked here.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 font-inter">
            <div className="flex items-center gap-3 mb-8">
                <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                    <HistoryIcon className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Temporal Audit Trail</h3>
                    <p className="text-xs text-slate-500 font-medium lowercase tracking-wider">
                        {entityType} ID: {entityId.slice(0, 8)}...
                    </p>
                </div>
            </div>

            <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                {logs.map((log) => (
                    <div key={log.id} className="relative group">
                        {/* Timeline Dot */}
                        <div className="absolute left-[-26px] top-1 h-3 w-3 rounded-full bg-white border-2 border-slate-300 group-hover:border-orange-500 transition-colors z-10"></div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm group-hover:shadow-md transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                        <User className="h-3.5 w-3.5 text-slate-600" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-900">{log.profiles?.full_name || 'System'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                    <Clock className="h-3.5 w-3.5" />
                                    {format(new Date(log.changed_at), 'MMM d, h:mm a')}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-slate-100 text-[10px] font-bold text-slate-600 uppercase tracking-widest rounded border border-slate-200">
                                        {log.field_name.replace('_', ' ')}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3 mt-1">
                                    <div className="flex-1 p-2 bg-slate-50 border border-slate-100 rounded-lg">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Old Value</p>
                                        <p className="text-sm font-medium text-slate-600 line-clamp-2">
                                            {log.old_value !== null ? String(log.old_value) : <span className="italic text-slate-300 font-normal">empty</span>}
                                        </p>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-slate-300 shrink-0" />
                                    <div className="flex-1 p-2 bg-orange-50 border border-orange-100 rounded-lg">
                                        <p className="text-[10px] font-bold text-orange-400 uppercase mb-1">New Value</p>
                                        <p className="text-sm font-bold text-orange-900 line-clamp-2">
                                            {log.new_value !== null ? String(log.new_value) : <span className="italic text-orange-300 font-normal">empty</span>}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
