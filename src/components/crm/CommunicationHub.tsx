import { useState } from 'react';
import {
    Phone,
    Mail,
    MessageSquare,
    Linkedin,
    Clock,
    Send,
    Plus,
    ArrowRight,
} from 'lucide-react';

interface Activity {
    id: string;
    type: 'call' | 'email' | 'message' | 'meeting' | 'linkedin';
    subject: string;
    content: string;
    timestamp: string;
    status: 'completed' | 'scheduled' | 'failed';
}

export default function CommunicationHub() {
    const [activeTab, setActiveTab] = useState<'all' | 'calls' | 'emails' | 'messages'>('all');

    const mockActivities: Activity[] = [
        {
            id: '1',
            type: 'call',
            subject: 'Follow-up on Proposal',
            content: 'Discussed pricing and timeline. Customer requested a 10% discount.',
            timestamp: '2026-01-25T10:30:00Z',
            status: 'completed',
        },
        {
            id: '2',
            type: 'email',
            subject: 'Product Catalog Sent',
            content: 'Sent the 2026 product guide as requested during the call.',
            timestamp: '2026-01-25T11:15:00Z',
            status: 'completed',
        },
    ];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden font-inter h-[600px] flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">Communication Hub</h2>
                    <p className="text-xs text-slate-500 font-medium">Unified omni-channel engagement</p>
                </div>
                <div className="flex gap-2">
                    <button className="p-2 bg-orange-100 text-orange-600 rounded-lg hover:bg-orange-200 transition-colors">
                        <Phone className="h-5 w-5" />
                    </button>
                    <button className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors">
                        <Mail className="h-5 w-5" />
                    </button>
                    <button className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors">
                        <MessageSquare className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar Mini Navigation */}
                <div className="w-16 border-r border-slate-100 flex flex-col items-center py-4 gap-4 bg-slate-50/30">
                    <button onClick={() => setActiveTab('all')} className={`p-2 rounded-xl transition-all ${activeTab === 'all' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}>
                        <Clock className="h-6 w-6" />
                    </button>
                    <button onClick={() => setActiveTab('calls')} className={`p-2 rounded-xl transition-all ${activeTab === 'calls' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}>
                        <Phone className="h-6 w-6" />
                    </button>
                    <button onClick={() => setActiveTab('emails')} className={`p-2 rounded-xl transition-all ${activeTab === 'emails' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}>
                        <Mail className="h-6 w-6" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {mockActivities.map((activity) => (
                            <div key={activity.id} className="relative pl-8">
                                <div className="absolute left-0 top-0 h-full w-px bg-slate-200"></div>
                                <div className="absolute left-[-4px] top-1 h-3 w-3 rounded-full bg-orange-500 ring-4 ring-white"></div>

                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                            {new Date(activity.timestamp).toLocaleString()}
                                        </span>
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded uppercase">
                                            <Plus className="h-3 w-3" />
                                            {activity.type}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-slate-900 mb-1">{activity.subject}</h4>
                                    <p className="text-sm text-slate-600 leading-relaxed">{activity.content}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Quick Reply / Action */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Type a message or internal note..."
                                className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                            />
                            <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/30">
                                <Send className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
