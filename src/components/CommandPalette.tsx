import { useState, useEffect, useRef } from 'react';
import {
  Search,
  FileText,
  Users,
  Package,
  Settings,
  Target,
  DollarSign,
  BarChart3,
  Plus,
  ArrowRight,
  Command,
  CheckCircle,
  Wrench,
  X,
  Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';

interface CommandAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  category: 'navigation' | 'create' | 'export' | 'filter' | 'other';
  keywords?: string[];
  roles?: string[];
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { navigate } = useNavigation();
  const { profile } = useAuth();

  const commands: CommandAction[] = [
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      description: 'View your dashboard',
      icon: LayoutDashboard,
      action: () => navigate('/dashboard'),
      category: 'navigation',
      keywords: ['home', 'overview'],
    },
    {
      id: 'nav-quotations',
      label: 'Go to Quotations',
      description: 'Manage quotations',
      icon: FileText,
      action: () => navigate('/quotations'),
      category: 'navigation',
      keywords: ['quotes', 'proposals'],
      roles: ['sales'],
    },
    {
      id: 'nav-customers',
      label: 'Go to Customers',
      description: 'View all customers',
      icon: Users,
      action: () => navigate('/customers'),
      category: 'navigation',
      keywords: ['clients', 'contacts'],
      roles: ['sales', 'manager', 'admin'],
    },
    {
      id: 'nav-products',
      label: 'Go to Products',
      description: 'Browse products',
      icon: Package,
      action: () => navigate('/products'),
      category: 'navigation',
      keywords: ['items', 'catalog'],
      roles: ['admin', 'finance'],
    },
    {
      id: 'nav-approvals',
      label: 'Go to Approvals',
      description: 'Review pending approvals',
      icon: CheckCircle,
      action: () => navigate('/approvals'),
      category: 'navigation',
      keywords: ['review', 'pending'],
      roles: ['manager', 'ceo', 'finance'],
    },
    {
      id: 'nav-commissions',
      label: 'Go to Commissions',
      description: 'View commission data',
      icon: DollarSign,
      action: () => navigate('/commissions'),
      category: 'navigation',
      keywords: ['earnings', 'bonus'],
      roles: ['sales', 'manager', 'ceo', 'finance', 'admin'],
    },
    {
      id: 'nav-targets',
      label: 'Go to Targets',
      description: 'Manage sales targets',
      icon: Target,
      action: () => navigate('/targets'),
      category: 'navigation',
      keywords: ['goals', 'objectives'],
      roles: ['manager', 'ceo'],
    },
    {
      id: 'nav-reports',
      label: 'Go to Reports',
      description: 'View analytics and reports',
      icon: BarChart3,
      action: () => navigate('/reports'),
      category: 'navigation',
      keywords: ['analytics', 'statistics'],
      roles: ['admin', 'manager', 'ceo'],
    },
    {
      id: 'nav-custom-items',
      label: 'Go to Custom Items',
      description: 'Manage custom items',
      icon: Wrench,
      action: () => navigate('/custom-items'),
      category: 'navigation',
      keywords: ['engineering', 'pricing'],
      roles: ['engineering'],
    },
    {
      id: 'nav-settings',
      label: 'Go to Settings',
      description: 'Application settings',
      icon: Settings,
      action: () => navigate('/settings'),
      category: 'navigation',
      keywords: ['config', 'preferences'],
      roles: ['admin'],
    },
    {
      id: 'create-quotation',
      label: 'Create New Quotation',
      description: 'Start a new quote',
      icon: Plus,
      action: () => {
        navigate('/quotations');
      },
      category: 'create',
      keywords: ['new', 'add'],
      roles: ['sales'],
    },
    {
      id: 'create-customer',
      label: 'Add New Customer',
      description: 'Create a new customer',
      icon: Plus,
      action: () => {
        navigate('/customers');
      },
      category: 'create',
      keywords: ['new', 'add', 'client'],
      roles: ['sales', 'manager', 'admin'],
    },
  ];

  const [dbResults, setDbResults] = useState<CommandAction[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const searchDatabase = async () => {
      if (!query.trim() || query.length < 2) {
        setDbResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const searchTerm = `%${query}%`;

        // Parallel fetching for speed
        const [leads, opportunities, products] = await Promise.all([
          supabase.from('crm_leads')
            .select('id, company_name, contact_name')
            .or(`company_name.ilike.${searchTerm},contact_name.ilike.${searchTerm}`)
            .limit(3),
          supabase.from('crm_opportunities')
            .select('id, name, amount')
            .ilike('name', searchTerm)
            .limit(3),
          supabase.from('products')
            .select('id, name, sku')
            .or(`name.ilike.${searchTerm},sku.ilike.${searchTerm}`)
            .limit(3)
        ]);

        const newResults: CommandAction[] = [];

        // Map Leads
        leads.data?.forEach((lead: any) => {
          newResults.push({
            id: `db-lead-${lead.id}`,
            label: lead.company_name,
            description: `Lead: ${lead.contact_name}`,
            icon: Users,
            category: 'leads' as any,
            action: () => navigate('/crm?tab=leads') // Replace with specific route if available
          });
        });

        // Map Opportunities
        opportunities.data?.forEach((opp: any) => {
          newResults.push({
            id: `db-opp-${opp.id}`,
            label: opp.name,
            description: `Opportunity: $${opp.amount.toLocaleString()}`,
            icon: Target,
            category: 'opportunities' as any,
            action: () => navigate('/crm?tab=opportunities')
          });
        });

        // Map Products
        products.data?.forEach((prod: any) => {
          newResults.push({
            id: `db-prod-${prod.id}`,
            label: prod.name,
            description: `Product SKU: ${prod.sku}`,
            icon: Package,
            category: 'products' as any,
            action: () => navigate('/products')
          });
        });

        setDbResults(newResults);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(searchDatabase, 300);
    return () => clearTimeout(timer);
  }, [query, navigate]);

  const filteredCommands = [
    ...commands.filter((cmd) => {
      if (cmd.roles && !cmd.roles.includes(profile?.role || '')) {
        return false;
      }

      if (!query.trim()) return true;

      const searchTerm = query.toLowerCase();
      const matchesLabel = cmd.label.toLowerCase().includes(searchTerm);
      const matchesDescription = cmd.description?.toLowerCase().includes(searchTerm);
      const matchesKeywords = cmd.keywords?.some((k) => k.toLowerCase().includes(searchTerm));

      return matchesLabel || matchesDescription || matchesKeywords;
    }),
    ...dbResults
  ];

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, CommandAction[]>);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (action: CommandAction) => {
    action.action();
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredCommands[selectedIndex]);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-orange-600 text-white rounded-full shadow-lg hover:bg-orange-700 transition-all hover:scale-110 z-40 group"
        title="Command Palette (⌘K)"
      >
        <Command className="w-6 h-6" />
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Press ⌘K
        </span>
      </button>
    );
  }

  const categoryLabels = {
    navigation: 'Navigation',
    create: 'Create New',
    export: 'Export',
    filter: 'Filters',
    other: 'Other',
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh] px-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[600px] flex flex-col animate-scale-in">
        <div className="flex items-center gap-3 p-4 border-b border-slate-200">
          <Command className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <div className="flex-1 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command or search..."
              className="flex-1 outline-none text-slate-900 placeholder-slate-400 text-sm"
              autoFocus
            />
            {isSearching && <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />}
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              setQuery('');
            }}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 text-sm">No commands found</p>
              <p className="text-slate-400 text-xs mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedCommands).map(([category, cmds]) => (
                <div key={category}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </div>
                  <div className="space-y-1">
                    {cmds.map((cmd, index) => {
                      const globalIndex = filteredCommands.indexOf(cmd);
                      const Icon = cmd.icon;
                      return (
                        <button
                          key={cmd.id}
                          onClick={() => handleSelect(cmd)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${globalIndex === selectedIndex
                            ? 'bg-orange-50 border border-orange-200 shadow-sm'
                            : 'hover:bg-slate-50 border border-transparent'
                            }`}
                        >
                          <div
                            className={`flex-shrink-0 p-2 rounded-lg ${globalIndex === selectedIndex ? 'bg-orange-100' : 'bg-slate-100'
                              }`}
                          >
                            <Icon
                              className={`w-4 h-4 ${globalIndex === selectedIndex ? 'text-orange-600' : 'text-slate-600'
                                }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-medium truncate ${globalIndex === selectedIndex ? 'text-orange-900' : 'text-slate-900'
                                }`}
                            >
                              {cmd.label}
                            </p>
                            {cmd.description && (
                              <p className="text-xs text-slate-500 truncate">{cmd.description}</p>
                            )}
                          </div>
                          <ArrowRight
                            className={`w-4 h-4 flex-shrink-0 ${globalIndex === selectedIndex ? 'text-orange-600' : 'text-slate-400'
                              }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-sm">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-sm">↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-sm">Esc</kbd>
              Close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LayoutDashboard(props: any) {
  return <BarChart3 {...props} />;
}
