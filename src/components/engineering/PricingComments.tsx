import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MessageSquare, Send } from 'lucide-react';

interface Comment {
    id: string;
    quotation_id: string;
    user_id: string;
    comment: string;
    created_at: string;
    user?: {
        full_name: string;
        role: string;
    };
}

interface PricingCommentsProps {
    quotationId: string;
}

export default function PricingComments({ quotationId }: PricingCommentsProps) {
    const { profile } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        fetchComments();

        // Subscribe to new comments
        const channel = supabase
            .channel(`pricing_comments_${quotationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'quotation_pricing_comments',
                    filter: `quotation_id=eq.${quotationId}`,
                },
                () => {
                    fetchComments();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [quotationId]);

    const fetchComments = async () => {
        try {
            const { data, error } = await (supabase
                .from('quotation_pricing_comments')
                .select(`
          *,
          user:profiles(full_name, role)
        `)
                .eq('quotation_id', quotationId)
                .order('created_at', { ascending: true }) as any);

            if (error) throw error;
            setComments(data || []);
        } catch (error) {
            console.error('Error fetching comments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !profile) return;

        setSending(true);
        try {
            const { error } = await (supabase.from('quotation_pricing_comments').insert({
                quotation_id: quotationId,
                user_id: profile.id,
                comment: newComment.trim(),
            }) as any);

            if (error) throw error;
            setNewComment('');
            fetchComments();
        } catch (error) {
            console.error('Error sending comment:', error);
            alert('Failed to send comment');
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-slate-400" />
                <h4 className="font-semibold text-slate-900">Pricing Discussion</h4>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
                {comments.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-sm text-slate-500 font-medium">No discussion yet</p>
                        <p className="text-xs text-slate-400 mt-1">Start the thread to ask for details or updates</p>
                    </div>
                ) : (
                    comments.map((c) => (
                        <div
                            key={c.id}
                            className={`flex flex-col ${c.user_id === profile?.id ? 'items-end' : 'items-start'}`}
                        >
                            <div className="flex items-center gap-2 mb-1 px-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    {c.user?.full_name} • {c.user?.role}
                                </span>
                            </div>
                            <div
                                className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${c.user_id === profile?.id
                                    ? 'bg-orange-500 text-white rounded-tr-none'
                                    : 'bg-white text-slate-900 rounded-tl-none border border-slate-200'
                                    }`}
                            >
                                {c.comment}
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1 px-1">
                                {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    ))
                )}
            </div>

            <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-orange-500 transition-all placeholder:text-slate-400"
                    />
                    <button
                        type="submit"
                        disabled={sending || !newComment.trim()}
                        className="p-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-full transition-all shadow-md shadow-orange-200"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </form>
        </div>
    );
}
