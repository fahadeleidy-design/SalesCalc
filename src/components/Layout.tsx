import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { TranslationKeys } from '../locales';
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  Wrench,
  CheckCircle,
  DollarSign,
  BarChart3,
  Target,
  Languages,
  ShoppingCart,
  TrendingUp,
  Activity,
  Briefcase,
  ListTodo,
  ClipboardList,
  Layers,
  PackageCheck,
  Factory,
  Warehouse,
  ArrowUpDown,
  ClipboardCheck,
  Truck,
  BarChart,
  Plug,
  Receipt,
  RefreshCw,
  CalendarRange,
  Timer,
  Bell,
  Calculator,
} from 'lucide-react';
import { UserRole } from '../lib/database.types';
import GlobalSearch from './GlobalSearch';
import KeyboardShortcutsHelper from './KeyboardShortcutsHelper';
import CommandPalette from './CommandPalette';

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  labelKey: keyof TranslationKeys['nav'];
  icon: typeof LayoutDashboard;
  path: string;
  roles: UserRole[];
}

const navigationItems: NavItem[] = [
  {
    labelKey: 'dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
    roles: ['sales', 'engineering', 'manager', 'ceo', 'finance', 'admin', 'solution_consultant', 'project_manager', 'purchasing'],
  },
  {
    labelKey: 'quotations',
    icon: FileText,
    path: '/quotations',
    roles: ['sales', 'finance', 'ceo', 'manager', 'solution_consultant'],
  },
  {
    labelKey: 'customItems',
    icon: Wrench,
    path: '/custom-items',
    roles: ['engineering', 'solution_consultant'],
  },
  {
    labelKey: 'approvals',
    icon: CheckCircle,
    path: '/approvals',
    roles: ['manager', 'ceo', 'finance'],
  },
  {
    labelKey: 'customers',
    icon: Users,
    path: '/customers',
    roles: ['sales', 'manager', 'admin', 'solution_consultant'],
  },
  {
    labelKey: 'crm',
    icon: Target,
    path: '/crm',
    roles: ['sales', 'manager', 'ceo', 'solution_consultant'],
  },
  {
    labelKey: 'products',
    icon: Package,
    path: '/products',
    roles: ['admin', 'finance', 'engineering', 'solution_consultant'],
  },
  {
    labelKey: 'commissions',
    icon: DollarSign,
    path: '/commissions',
    roles: ['sales', 'manager', 'ceo', 'finance', 'admin'],
  },
  {
    labelKey: 'purchaseOrders',
    icon: ShoppingCart,
    path: '/purchase-orders',
    roles: ['finance', 'ceo', 'admin', 'engineering', 'solution_consultant', 'purchasing'],
  },
  {
    labelKey: 'collection',
    icon: TrendingUp,
    path: '/collection',
    roles: ['sales', 'manager', 'finance', 'ceo', 'admin'],
  },
  {
    labelKey: 'profitability',
    icon: TrendingUp,
    path: '/profitability',
    roles: ['finance', 'ceo', 'admin'],
  },
  {
    labelKey: 'demos',
    icon: Target,
    path: '/demos',
    roles: ['solution_consultant', 'manager'],
  },
  {
    labelKey: 'discovery',
    icon: Target,
    path: '/technical-discovery',
    roles: ['solution_consultant', 'manager'],
  },
  {
    labelKey: 'configurator',
    icon: Target,
    path: '/configurator',
    roles: ['solution_consultant', 'manager'],
  },
  {
    labelKey: 'roiCalculator',
    icon: TrendingUp,
    path: '/roi-calculator',
    roles: ['solution_consultant', 'manager'],
  },
  {
    labelKey: 'activityLog',
    icon: Activity,
    path: '/activity-log',
    roles: ['solution_consultant', 'manager'],
  },
  {
    labelKey: 'scheduling',
    icon: Users,
    path: '/scheduling',
    roles: ['solution_consultant', 'manager'],
  },
  {
    labelKey: 'battlecards',
    icon: Target,
    path: '/competitive-intel',
    roles: ['solution_consultant', 'manager'],
  },
  {
    labelKey: 'presalesAnalytics',
    icon: BarChart3,
    path: '/presales-analytics',
    roles: ['solution_consultant', 'manager', 'ceo'],
  },
  {
    labelKey: 'targets',
    icon: Target,
    path: '/targets',
    roles: ['manager', 'ceo', 'finance'],
  },
  {
    labelKey: 'teams',
    icon: Users,
    path: '/teams',
    roles: ['manager'],
  },
  {
    labelKey: 'reports',
    icon: BarChart3,
    path: '/reports',
    roles: ['admin', 'manager', 'ceo'],
  },
  {
    labelKey: 'customReports',
    icon: BarChart3,
    path: '/custom-reports',
    roles: ['finance', 'ceo', 'admin', 'solution_consultant'],
  },
  {
    labelKey: 'users',
    icon: Users,
    path: '/users',
    roles: ['admin'],
  },
  {
    labelKey: 'settings',
    icon: Settings,
    path: '/settings',
    roles: ['sales', 'engineering', 'manager', 'ceo', 'finance', 'admin', 'solution_consultant', 'project_manager', 'purchasing'],
  },
  {
    labelKey: 'projects',
    icon: Briefcase,
    path: '/projects',
    roles: ['project_manager'],
  },
  {
    labelKey: 'projectTasks',
    icon: ListTodo,
    path: '/project-tasks',
    roles: ['project_manager'],
  },
  {
    labelKey: 'projectTimeline',
    icon: CalendarRange,
    path: '/project-timeline',
    roles: ['project_manager', 'ceo', 'manager'],
  },
  {
    labelKey: 'timesheets',
    icon: Timer,
    path: '/timesheets',
    roles: ['project_manager', 'engineering', 'purchasing'],
  },
  {
    labelKey: 'projectBudgets',
    icon: DollarSign,
    path: '/project-budgets',
    roles: ['project_manager', 'finance', 'ceo'],
  },
  {
    labelKey: 'resourceUtilization',
    icon: Users,
    path: '/resource-utilization',
    roles: ['project_manager', 'manager', 'ceo'],
  },
  {
    labelKey: 'procurementRequests',
    icon: ClipboardList,
    path: '/procurement-requests',
    roles: ['purchasing'],
  },
  {
    labelKey: 'billOfMaterials',
    icon: Layers,
    path: '/bom',
    roles: ['purchasing'],
  },
  {
    labelKey: 'suppliers',
    icon: Users,
    path: '/suppliers',
    roles: ['purchasing'],
  },
  {
    labelKey: 'goodsReceiving',
    icon: PackageCheck,
    path: '/goods-receiving',
    roles: ['purchasing'],
  },
  {
    labelKey: 'invoiceMatching',
    icon: Receipt,
    path: '/invoice-matching',
    roles: ['purchasing', 'finance', 'ceo', 'admin'],
  },
  {
    labelKey: 'purchaseContracts',
    icon: FileText,
    path: '/purchase-contracts',
    roles: ['purchasing', 'finance', 'ceo', 'admin'],
  },
  {
    labelKey: 'spendAnalytics',
    icon: BarChart3,
    path: '/spend-analytics',
    roles: ['purchasing', 'finance', 'ceo', 'admin', 'manager'],
  },
  {
    labelKey: 'automatedReorder',
    icon: RefreshCw,
    path: '/automated-reorder',
    roles: ['purchasing', 'admin'],
  },
  {
    labelKey: 'production',
    icon: Factory,
    path: '/production',
    roles: ['purchasing', 'engineering', 'project_manager', 'manager'],
  },
  {
    labelKey: 'warehouse',
    icon: Warehouse,
    path: '/warehouse',
    roles: ['purchasing', 'engineering', 'admin'],
  },
  {
    labelKey: 'warehouseOperations',
    icon: ClipboardList,
    path: '/warehouse-operations',
    roles: ['purchasing', 'project_manager', 'engineering', 'manager', 'admin'],
  },
  {
    labelKey: 'stockMovements',
    icon: ArrowUpDown,
    path: '/stock-movements',
    roles: ['purchasing', 'admin'],
  },
  {
    labelKey: 'qualityControl',
    icon: ClipboardCheck,
    path: '/quality-inspections',
    roles: ['purchasing', 'engineering', 'project_manager', 'manager', 'admin', 'ceo', 'finance'],
  },
  {
    labelKey: 'qualityCosts',
    icon: DollarSign,
    path: '/quality-costs',
    roles: ['purchasing', 'engineering', 'project_manager', 'admin', 'finance', 'ceo'],
  },
  {
    labelKey: 'samplingPlans',
    icon: Calculator,
    path: '/sampling-plans',
    roles: ['purchasing', 'engineering', 'project_manager', 'admin'],
  },
  {
    labelKey: 'qualityAlerts',
    icon: Bell,
    path: '/quality-alerts',
    roles: ['purchasing', 'engineering', 'project_manager', 'admin', 'manager', 'ceo'],
  },
  {
    labelKey: 'shipments',
    icon: Truck,
    path: '/shipments',
    roles: ['purchasing', 'project_manager', 'manager', 'admin'],
  },
  {
    labelKey: 'logisticsDashboard',
    icon: BarChart,
    path: '/logistics',
    roles: ['purchasing', 'project_manager', 'manager', 'admin'],
  },
  {
    labelKey: 'integrations',
    icon: Plug,
    path: '/integrations',
    roles: ['admin'],
  },
];

export default function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const { currentPath, navigate, resetNavigation } = useNavigation();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    resetNavigation();
    await signOut();
  };

  const filteredNav = navigationItems.filter((item) =>
    profile?.role ? item.roles.includes(profile.role) : false
  );

  const handleNavClick = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };


  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-50 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6 text-slate-700" />
          </button>
          <img src="/logo.svg" alt="Special Offices" className="h-8" />
          <h2 className="text-lg font-semibold text-slate-900 hidden sm:block">
            {t.nav[filteredNav.find((item) => item.path === currentPath)?.labelKey || 'dashboard']}
          </h2>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:block">
            <GlobalSearch />
          </div>
          <button
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
          >
            <Languages className="w-4 h-4 text-slate-600" />
            <span className="text-xs sm:text-sm font-medium text-slate-700">
              {language === 'en' ? 'EN' : 'ع'}
            </span>
          </button>
          <button
            onClick={() => navigate('/notifications')}
            className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title={t.nav.notifications}
          >
            <Bell className="w-5 h-5 text-slate-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>
      </header>

      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-slate-200 z-[60] transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Special Offices" className="h-10 w-auto" />
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)]">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${isActive
                  ? 'bg-orange-50 text-orange-600 font-medium'
                  : 'text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span>{t.nav[item.labelKey]}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 bg-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
              <span className="font-medium text-slate-700">
                {profile?.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {profile?.full_name}
              </p>
              <p className="text-xs text-slate-600 capitalize">{profile?.role}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-all active:scale-95"
          >
            <LogOut className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            <span className="text-sm">{t.nav.signOut}</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[55]"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="pt-16">
        <main className="p-4 sm:p-6 pb-32">{children}</main>
      </div>

      {/* Keyboard Shortcuts Helper */}
      <KeyboardShortcutsHelper />

      {/* Command Palette */}
      <CommandPalette />
    </div>
  );
}
