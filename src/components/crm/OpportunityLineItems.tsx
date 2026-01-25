import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import {
    Plus,
    Trash2,
    Calculator,
    TrendingDown,
    PieChart,
    ShoppingBag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../lib/currencyUtils';

interface LineItem {
    id: string;
    opportunity_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    discount_percent: number;
    total_price: number;
    product?: { name: string; sku: string };
}

interface OpportunityLineItemsProps {
    opportunityId: string;
}

export default function OpportunityLineItems({ opportunityId }: OpportunityLineItemsProps) {
    const queryClient = useQueryClient();
    const [isAdding, setIsAdding] = useState(false);

    const { data: lineItems, isLoading } = useQuery({
        queryKey: ['crm-opportunity-line-items', opportunityId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('crm_opportunity_line_items')
                .select('*, product:crm_products(name, sku)')
                .eq('opportunity_id', opportunityId);
            if (error) throw error;
            return data as LineItem[];
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('crm_opportunity_line_items').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm-opportunity-line-items', opportunityId] });
            queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
            toast.success('Line item removed');
        },
    });

    const totalValue = lineItems?.reduce((sum, item) => sum + Number(item.total_price), 0) || 0;
    const avgDiscount = lineItems?.length ? lineItems.reduce((sum, item) => sum + Number(item.discount_percent), 0) / lineItems.length : 0;

    return (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden font-inter shadow-sm">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-100 p-3 rounded-2xl">
                        <ShoppingBag className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Deal Line Items</h3>
                        <p className="text-sm text-slate-500 font-medium">Products and customized pricing for this opportunity</p>
                    </div>
                </div>

                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/30"
                >
                    <Plus className="h-5 w-5" />
                    Add Product
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-slate-50/50">
                <div className="p-6 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Total Contract Value</p>
                    <div className="flex items-center justify-center gap-2">
                        <Calculator className="h-4 w-4 text-indigo-500" />
                        <span className="text-2xl font-black text-slate-900">{formatCurrency(totalValue)}</span>
                    </div>
                </div>
                <div className="p-6 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Avg. Discount Applied</p>
                    <div className="flex items-center justify-center gap-2">
                        <TrendingDown className="h-4 w-4 text-orange-500" />
                        <span className="text-2xl font-black text-slate-900">{avgDiscount.toFixed(1)}%</span>
                    </div>
                </div>
                <div className="p-6 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Item Count</p>
                    <div className="flex items-center justify-center gap-2">
                        <PieChart className="h-4 w-4 text-emerald-500" />
                        <span className="text-2xl font-black text-slate-900">{lineItems?.length || 0}</span>
                    </div>
                </div>
            </div>

            <div className="p-0 overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-white border-b border-slate-100">
                        <tr>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product / SKU</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qty</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Price</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Disc%</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {isLoading ? (
                            <tr><td colSpan={6} className="px-8 py-4 text-center text-slate-400 font-bold animate-pulse">Calculating line items...</td></tr>
                        ) : lineItems?.length === 0 ? (
                            <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-bold italic">No line items added to this deal yet.</td></tr>
                        ) : (
                            lineItems?.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div>
                                            <span className="text-[9px] font-black text-slate-300 uppercase block leading-none mb-1">{item.product?.sku}</span>
                                            <p className="text-sm font-bold text-slate-900">{item.product?.name}</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span className="px-3 py-1 bg-slate-100 rounded-lg text-sm font-black text-slate-700">
                                            {item.quantity}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-sm font-bold text-slate-600">{formatCurrency(item.unit_price)}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-2 py-0.5 rounded text-[11px] font-black ${item.discount_percent > 0 ? 'bg-orange-100 text-orange-600' : 'text-slate-400'}`}>
                                            {item.discount_percent}%
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right font-black text-slate-900 text-sm">
                                        {formatCurrency(item.total_price)}
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button
                                            onClick={() => deleteMutation.mutate(item.id)}
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="bg-slate-50 p-6 flex justify-end items-center gap-4">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Estimated Deal Revenue</p>
                <div className="flex items-center gap-2 bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-indigo-600">
                    <Calculator className="h-5 w-5 text-indigo-600" />
                    <span className="text-2xl font-black text-slate-900 tracking-tighter">{formatCurrency(totalValue)}</span>
                </div>
            </div>
        </div>
    );
}
