import React from 'react';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { useNavigation, NavigationProvider } from './contexts/NavigationContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import SalesDashboard from './pages/SalesDashboard';
import EngineeringDashboard from './pages/EngineeringDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import CEODashboard from './pages/CEODashboard';
import AdminDashboard from './pages/AdminDashboard';
import FinanceDashboard from './pages/FinanceDashboard';
import QuotationsPage from './pages/QuotationsPage';
import CustomItemsPage from './pages/CustomItemsPage';
import ApprovalsPage from './pages/ApprovalsPage';
import CustomersPage from './pages/CustomersPage';
import ProductsPage from './pages/ProductsPage';
import CommissionsPage from './pages/CommissionsPage';
import TargetsPage from './pages/TargetsPage';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import { SkeletonDashboard } from './components/ui/SkeletonLoader';
import { ErrorBoundary } from './components/ErrorBoundary';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const { currentPath, resetNavigation } = useNavigation();
  const { loadUserLanguage } = useLanguage();

  // Reset navigation when user changes (login/logout)
  React.useEffect(() => {
    if (user) {
      resetNavigation();
    }
  }, [user?.id, resetNavigation]);

  // Load user's preferred language when profile is available
  React.useEffect(() => {
    if (profile?.id) {
      loadUserLanguage(profile.id);
    }
  }, [profile?.id, loadUserLanguage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="lg:pl-64 pt-16 lg:pt-0">
          <div className="p-6">
            <div className="animate-fade-in">
              <SkeletonDashboard />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Login />;
  }

  const getDashboardForRole = () => {
    switch (profile.role) {
      case 'sales':
        return <SalesDashboard />;
      case 'engineering':
        return <EngineeringDashboard />;
      case 'manager':
        return <ManagerDashboard />;
      case 'finance':
        return <FinanceDashboard />;
      case 'ceo':
        return <CEODashboard />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <SalesDashboard />;
    }
  };

  const getPageContent = () => {
    // Role-based access control
    const hasAccess = (allowedRoles: string[]) => {
      return allowedRoles.includes(profile.role);
    };

    const UnauthorizedPage = () => (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );

    switch (currentPath) {
      case '/dashboard':
        return getDashboardForRole();
      case '/quotations':
        return hasAccess(['sales', 'finance', 'ceo', 'manager']) ? <QuotationsPage /> : <UnauthorizedPage />;
      case '/custom-items':
        return hasAccess(['engineering']) ? <CustomItemsPage /> : <UnauthorizedPage />;
      case '/approvals':
        return hasAccess(['manager', 'ceo', 'finance']) ? <ApprovalsPage /> : <UnauthorizedPage />;
      case '/customers':
        return hasAccess(['sales', 'manager', 'admin']) ? <CustomersPage /> : <UnauthorizedPage />;
      case '/products':
        return hasAccess(['admin', 'finance']) ? <ProductsPage /> : <UnauthorizedPage />;
      case '/commissions':
        return hasAccess(['sales', 'manager', 'ceo', 'finance', 'admin']) ? <CommissionsPage /> : <UnauthorizedPage />;
      case '/targets':
        return hasAccess(['manager', 'ceo', 'finance']) ? <TargetsPage /> : <UnauthorizedPage />;
      case '/settings':
        return hasAccess(['admin']) ? <SettingsPage /> : <UnauthorizedPage />;
      case '/notifications':
        return <NotificationsPage />;
      case '/reports':
        return hasAccess(['admin', 'manager', 'ceo']) ? <ReportsPage /> : <UnauthorizedPage />;
      case '/users':
        return hasAccess(['admin']) ? <UsersPage /> : <UnauthorizedPage />;
      case '/purchase-orders':
        return hasAccess(['finance', 'ceo', 'admin']) ? <PurchaseOrdersPage /> : <UnauthorizedPage />;
      default:
        return getDashboardForRole();
    }
  };

  return <Layout>{getPageContent()}</Layout>;
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <NavigationProvider>
            <AppContent />
          </NavigationProvider>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
