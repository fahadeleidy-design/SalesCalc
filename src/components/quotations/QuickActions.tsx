import { useState, useEffect } from 'react';
import { Star, Clock, Copy, FileText, Zap, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';

type Product = Database['public']['Tables']['products']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'];

interface QuickActionsProps {
  onQuickQuote: (customerId: string, products: Product[]) => void;
  onDuplicate: (quotationId: string) => void;
  onUseTemplate: (templateId: string) => void;
}

export default function QuickActions({ onQuickQuote, onDuplicate, onUseTemplate }: QuickActionsProps) {
  const { profile } = useAuth();
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [frequentProducts, setFrequentProducts] = useState<Product[]>([]);
  const [recentQuotations, setRecentQuotations] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuickAccessData();
  }, [profile]);

  const loadQuickAccessData = async () => {
    if (!profile) return;

    try {
      // Load favorite products
      const { data: favData } = await supabase
        .from('product_favorites')
        .select('product:products(*)')
        .eq('user_id', profile.id)
        .limit(5);

      if (favData) {
        setFavoriteProducts(favData.map((f: any) => f.product).filter(Boolean));
      }

      // Load recent customers
      const { data: recentData } = await supabase
        .from('recent_customers')
        .select('customer:customers(*)')
        .eq('user_id', profile.id)
        .order('last_accessed_at', { ascending: false })
        .limit(5);

      if (recentData) {
        setRecentCustomers(recentData.map((r: any) => r.customer).filter(Boolean));
      }

      // Load frequently used products
      const { data: freqData } = await supabase
        .from('frequently_used_products')
        .select('*')
        .limit(5);

      if (freqData) {
        setFrequentProducts(freqData);
      }

      // Load recent quotations
      const { data: quotData } = await supabase
        .from('user_recent_quotations')
        .select('*')
        .eq('sales_rep_id', profile.id)
        .limit(3);

      if (quotData) {
        setRecentQuotations(quotData);
      }

      // Load templates
      const { data: templateData } = await supabase
        .from('user_quotation_templates')
        .select('*')
        .order('usage_count', { ascending: false })
        .limit(3);

      if (templateData) {
        setTemplates(templateData);
      }
    } catch (error) {
      console.error('Error loading quick access data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (productId: string) => {
    try {
      await supabase.rpc('toggle_product_favorite', { p_product_id: productId });
      loadQuickAccessData();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
          <div className="h-20 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recent Customers */}
      {recentCustomers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-slate-900">Recent Customers</h3>
          </div>
          <div className="space-y-2">
            {recentCustomers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => onQuickQuote(customer.id, [])}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-between group"
              >
                <span className="text-sm font-medium text-slate-900">{customer.company_name}</span>
                <Zap className="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Favorite Products */}
      {favoriteProducts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <h3 className="font-semibold text-slate-900">Favorite Products</h3>
          </div>
          <div className="space-y-2">
            {favoriteProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                  <p className="text-xs text-slate-500">{product.sku}</p>
                </div>
                <button
                  onClick={() => handleToggleFavorite(product.id)}
                  className="ml-2 p-1 text-amber-500 hover:bg-amber-50 rounded"
                >
                  <Star className="w-4 h-4 fill-amber-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Frequently Used Products */}
      {frequentProducts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <h3 className="font-semibold text-slate-900">Most Used</h3>
          </div>
          <div className="space-y-2">
            {frequentProducts.slice(0, 3).map((product: any) => (
              <div
                key={product.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                  <p className="text-xs text-slate-500">Used {product.usage_count} times</p>
                </div>
                <button
                  onClick={() => handleToggleFavorite(product.id)}
                  className="ml-2 p-1 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded"
                >
                  <Star className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Quotations */}
      {recentQuotations.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Copy className="w-4 h-4 text-purple-600" />
            <h3 className="font-semibold text-slate-900">Recent Quotations</h3>
          </div>
          <div className="space-y-2">
            {recentQuotations.map((quote) => (
              <button
                key={quote.id}
                onClick={() => onDuplicate(quote.id)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-purple-50 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{quote.title}</p>
                    <p className="text-xs text-slate-500">{quote.customer_name}</p>
                  </div>
                  <Copy className="w-4 h-4 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Templates */}
      {templates.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-indigo-600" />
            <h3 className="font-semibold text-slate-900">Templates</h3>
          </div>
          <div className="space-y-2">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => onUseTemplate(template.id)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{template.name}</p>
                    {template.description && (
                      <p className="text-xs text-slate-500 truncate">{template.description}</p>
                    )}
                  </div>
                  <Zap className="w-4 h-4 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
