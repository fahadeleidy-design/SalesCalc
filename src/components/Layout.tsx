import { ReactNode, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import {
  Building2,
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
} from 'lucide-react';
import { UserRole } from '../lib/database.types';
import GlobalSearch from './GlobalSearch';

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  path: string;
  roles: UserRole[];
}

const navigationItems: NavItem[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
    roles: ['sales', 'engineering', 'manager', 'ceo', 'finance', 'admin'],
  },
  {
    label: 'Quotations',
    icon: FileText,
    path: '/quotations',
    roles: ['sales', 'manager', 'ceo', 'finance'],
  },
  {
    label: 'Custom Items',
    icon: Wrench,
    path: '/custom-items',
    roles: ['engineering'],
  },
  {
    label: 'Approvals',
    icon: CheckCircle,
    path: '/approvals',
    roles: ['manager', 'ceo', 'finance'],
  },
  {
    label: 'Customers',
    icon: Users,
    path: '/customers',
    roles: ['sales', 'manager', 'admin'],
  },
  {
    label: 'Products',
    icon: Package,
    path: '/products',
    roles: ['admin', 'sales'],
  },
  {
    label: 'Commissions',
    icon: DollarSign,
    path: '/commissions',
    roles: ['sales', 'admin'],
  },
  {
    label: 'Reports',
    icon: BarChart3,
    path: '/reports',
    roles: ['admin', 'manager', 'ceo'],
  },
  {
    label: 'Users',
    icon: Users,
    path: '/users',
    roles: ['admin'],
  },
  {
    label: 'Settings',
    icon: Settings,
    path: '/settings',
    roles: ['admin'],
  },
];

export default function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const { currentPath, navigate } = useNavigation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredNav = navigationItems.filter((item) =>
    profile?.role ? item.roles.includes(profile.role) : false
  );

  const handleNavClick = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-slate-900">Special Offices</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-slate-200 z-40 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">Special Offices</h1>
              <p className="text-xs text-slate-600">Sales System</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
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
            onClick={signOut}
            className="w-full flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="lg:pl-64 pt-16 lg:pt-0">
        <header className="bg-white border-b border-slate-200 px-6 py-4 hidden lg:flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            {filteredNav.find((item) => item.path === currentPath)?.label || 'Dashboard'}
          </h2>
          <div className="flex items-center gap-4">
            <GlobalSearch />
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
