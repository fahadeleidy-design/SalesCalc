import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import {
    BookOpen,
    Search,
    ChevronRight,
    Plus,
    ArrowLeft,
} from 'lucide-react';

interface Article {
    id: string;
    title: string;
    content: string;
    category: string;
    tags: string[];
    created_at: string;
}

export default function KnowledgeBasePortal() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

    const { data: articles, isLoading } = useQuery({
        queryKey: ['crm-kb-articles'],
        queryFn: async () => {
            const { data, error } = await (supabase as any)
                .from('crm_knowledge_base')
                .select('*')
                .eq('is_published', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as Article[];
        },
    });

    const filteredArticles = articles?.filter(a =>
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (selectedArticle) {
        return (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden font-inter min-h-[600px] flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <button
                        onClick={() => setSelectedArticle(null)}
                        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Articles
                    </button>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                            Edit Article
                        </button>
                    </div>
                </div>

                <div className="p-12 max-w-4xl mx-auto w-full">
                    <div className="mb-8">
                        <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-200">
                            {selectedArticle.category}
                        </span>
                        <h1 className="text-4xl font-black text-slate-900 mt-4 tracking-tight leading-tight">
                            {selectedArticle.title}
                        </h1>
                        <div className="flex items-center gap-4 mt-6 text-slate-400 text-sm font-medium">
                            <span>Published {new Date(selectedArticle.created_at).toLocaleDateString()}</span>
                            <div className="h-1 w-1 bg-slate-300 rounded-full" />
                            <span>4 min read</span>
                        </div>
                    </div>

                    <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-4">
                        {selectedArticle.content.split('\n').map((para, i) => (
                            <p key={i}>{para}</p>
                        ))}
                    </div>

                    <div className="mt-12 pt-8 border-t border-slate-100 flex flex-wrap gap-2">
                        {selectedArticle.tags?.map((tag, i) => (
                            <span key={i} className="px-3 py-1 bg-slate-50 text-slate-500 text-[10px] font-bold uppercase rounded-lg border border-slate-200">
                                #{tag}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 font-inter">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                    <div className="bg-orange-100 p-3 rounded-xl shadow-inner">
                        <BookOpen className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Knowledge Base</h2>
                        <p className="text-sm text-slate-500 font-medium">Internal & external support repository</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search articles by title, content or tags..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 outline-none transition-all font-medium text-sm"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/30">
                        <Plus className="h-5 w-5" />
                        New Article
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    [...Array(6)].map((_, i) => (
                        <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
                    ))
                ) : filteredArticles?.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-slate-200">
                        <BookOpen className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-900">No articles found</h3>
                        <p className="text-sm text-slate-500">Try adjusting your search criteria</p>
                    </div>
                ) : (
                    filteredArticles?.map((article) => (
                        <div
                            key={article.id}
                            onClick={() => setSelectedArticle(article)}
                            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[9px] font-black uppercase tracking-wider rounded border border-orange-100">
                                    {article.category}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">
                                    {new Date(article.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-orange-600 transition-colors line-clamp-2">
                                {article.title}
                            </h3>
                            <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed mb-6">
                                {article.content}
                            </p>
                            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                <div className="flex gap-1.5">
                                    {article.tags?.slice(0, 2).map((tag, i) => (
                                        <span key={i} className="text-[10px] font-bold text-slate-400">#{tag}</span>
                                    ))}
                                </div>
                                <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-orange-600 group-hover:text-white transition-all">
                                    <ChevronRight className="h-4 w-4" />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
