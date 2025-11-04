import { useState, useEffect, useRef } from 'react';
import { Search, FileText, Users, Package, X, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigation } from '../contexts/NavigationContext';

interface SearchResult {
  id: string;
  type: 'quotation' | 'customer' | 'product';
  title: string;
  subtitle: string;
  metadata?: string;
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { navigate } = useNavigation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const debounce = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(debounce);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    try {
      const searchTerm = searchQuery.toLowerCase();

      const [quotationsData, customersData, productsData] = await Promise.all([
        supabase
          .from('quotations')
          .select('id, quotation_number, status, total, customer:customers(company_name)')
          .or(`quotation_number.ilike.%${searchTerm}%,status.ilike.%${searchTerm}%`)
          .limit(5),
        supabase
          .from('customers')
          .select('id, company_name, contact_name, email')
          .or(
            `company_name.ilike.%${searchTerm}%,contact_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
          )
          .limit(5),
        supabase
          .from('products')
          .select('id, name, sku, category')
          .or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
          .limit(5),
      ]);

      const allResults: SearchResult[] = [];

      if (quotationsData.data) {
        quotationsData.data.forEach((q: any) => {
          allResults.push({
            id: q.id,
            type: 'quotation',
            title: q.quotation_number,
            subtitle: (q.customer as any)?.company_name || 'Unknown Customer',
            metadata: `${q.status} • $${Number(q.total).toFixed(2)}`,
          });
        });
      }

      if (customersData.data) {
        customersData.data.forEach((c) => {
          allResults.push({
            id: c.id,
            type: 'customer',
            title: c.company_name,
            subtitle: c.contact_name || '',
            metadata: c.email || '',
          });
        });
      }

      if (productsData.data) {
        productsData.data.forEach((p) => {
          allResults.push({
            id: p.id,
            type: 'product',
            title: p.name,
            subtitle: p.sku || '',
            metadata: p.category || '',
          });
        });
      }

      setResults(allResults);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case 'quotation':
        navigate('/quotations');
        break;
      case 'customer':
        navigate('/customers');
        break;
      case 'product':
        navigate('/products');
        break;
    }
    setIsOpen(false);
    setQuery('');
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleResultClick(results[selectedIndex]);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'quotation':
        return <FileText className="w-5 h-5 text-coral-600" />;
      case 'customer':
        return <Users className="w-5 h-5 text-teal-600" />;
      case 'product':
        return <Package className="w-5 h-5 text-green-600" />;
      default:
        return <Search className="w-5 h-5 text-slate-600" />;
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-sm text-slate-600"
      >
        <Search className="w-4 h-4" />
        <span className="hidden md:inline">Search...</span>
        <kbd className="hidden md:inline px-2 py-0.5 text-xs bg-white border border-slate-300 rounded">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20 px-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[600px] flex flex-col">
        <div className="flex items-center gap-3 p-4 border-b border-slate-200">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search quotations, customers, products..."
            className="flex-1 outline-none text-slate-900 placeholder-slate-400"
            autoFocus
          />
          <button
            onClick={() => {
              setIsOpen(false);
              setQuery('');
              setResults([]);
            }}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral-600"></div>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12">
              {query.trim().length < 2 ? (
                <div>
                  <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 text-sm">
                    Type at least 2 characters to search
                  </p>
                  <p className="text-slate-400 text-xs mt-2">
                    Search across quotations, customers, and products
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-slate-600 text-sm">No results found for "{query}"</p>
                  <p className="text-slate-400 text-xs mt-2">
                    Try different keywords or check spelling
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    index === selectedIndex
                      ? 'bg-coral-50 border border-blue-200'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex-shrink-0">{getIcon(result.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{result.title}</p>
                    {result.subtitle && (
                      <p className="text-xs text-slate-600 truncate">{result.subtitle}</p>
                    )}
                    {result.metadata && (
                      <p className="text-xs text-slate-400 truncate">{result.metadata}</p>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-0.5 bg-white border border-slate-300 rounded">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-0.5 bg-white border border-slate-300 rounded">↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-0.5 bg-white border border-slate-300 rounded">Esc</kbd>
              Close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
