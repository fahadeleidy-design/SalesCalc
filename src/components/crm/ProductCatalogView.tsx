import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import {
    Package,
    Plus,
    Search,
    Tag,
    Layers,
    Edit2,
    ChevronRight,
} from 'lucide-react';
import { formatCurrency } from '../../lib/currencyUtils';

interface Product {
    id: string;
    name: string;
    sku: string;
    description: string;
    category: string;
    standard_price: number;
    is_active: boolean;
    currency: string;
}

interface PriceBook {
    id: string;
    name: string;
    description: string;
    is_active: boolean;
    is_standard: boolean;
}

export default function ProductCatalogView() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'products' | 'pricebooks'>('products');
    const [searchTerm, setSearchTerm] = useState('');

    const { data: products, isLoading: productsLoading } = useQuery({
        queryKey: ['crm-products'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('crm_products')
                .select('*')
                .order('name');
            if (error) throw error;
            return data as Product[];
        },
    });

    const { data: priceBooks, isLoading: priceBooksLoading } = useQuery({
        queryKey: ['crm-price-books'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('crm_price_books')
                .select('*')
                .order('is_standard', { ascending: false });
            if (error) throw error;
            return data as PriceBook[];
        },
    });

    const filteredProducts = products?.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 font-inter">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-100 p-3 rounded-xl shadow-inner">
                        <Package className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Product Catalog & CPQ</h2>
                        <p className="text-sm text-slate-500 font-medium">Manage offerings, SKU pricing, and price books</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex">
                        <button
                            onClick={() => setActiveTab('products')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'products' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Products
                        </button>
                        <button
                            onClick={() => setActiveTab('pricebooks')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'pricebooks' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Price Books
                        </button>
                    </div>

                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={`Search ${activeTab}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-medium text-sm"
                        />
                    </div>

                    <button className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/30">
                        <Plus className="h-5 w-5" />
                        Add {activeTab === 'products' ? 'Product' : 'Book'}
                    </button>
                </div>
            </div>

            {activeTab === 'products' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {productsLoading ? (
                        [...Array(6)].map((_, i) => <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse" />)
                    ) : filteredProducts?.length === 0 ? (
                        <div className="col-span-full py-20 bg-white rounded-3xl border border-slate-200 text-center">
                            <Package className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-900">No products found</h3>
                            <p className="text-sm text-slate-500">Add your first product to start quoting</p>
                        </div>
                    ) : (
                        filteredProducts?.map((product) => (
                            <div key={product.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl">
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-indigo-50 rounded-lg">
                                        <Tag className="h-5 w-5 text-indigo-500" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter block">{product.sku}</span>
                                        <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{product.name}</h3>
                                    </div>
                                </div>

                                <p className="text-sm text-slate-500 line-clamp-2 min-h-[40px] mb-6 font-medium">
                                    {product.description || 'No description provided.'}
                                </p>

                                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Standard Price</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-black text-slate-900">{formatCurrency(product.standard_price)}</span>
                                            <span className="text-xs font-bold text-slate-400 uppercase">{product.currency}</span>
                                        </div>
                                    </div>

                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${product.is_active ? 'bg-green-100 text-green-600 border border-green-200' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                                        {product.is_active ? 'Active' : 'Archived'}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {priceBooksLoading ? (
                        [...Array(3)].map((_, i) => <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse" />)
                    ) : (
                        priceBooks?.map((book) => (
                            <div key={book.id} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                                {book.is_standard && (
                                    <div className="absolute top-0 right-0 bg-indigo-600 text-white px-6 py-1 text-[10px] font-black uppercase tracking-widest rotate-45 translate-x-4 translate-y-2">
                                        Global
                                    </div>
                                )}

                                <div className="bg-slate-50 p-4 rounded-2xl mb-6 w-fit">
                                    <Layers className="h-6 w-6 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                </div>

                                <h3 className="text-xl font-black text-slate-900 mb-2">{book.name}</h3>
                                <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
                                    {book.description || 'No description available for this price book.'}
                                </p>

                                <div className="flex items-center justify-between">
                                    <button className="flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-widest hover:gap-3 transition-all group-hover:underline">
                                        Manage Entries
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                    <div className={`h-2 w-2 rounded-full ${book.is_active ? 'bg-green-500' : 'bg-slate-300'} shadow-[0_0_8px_rgba(34,197,94,0.4)]`} />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
