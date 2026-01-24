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
import TeamsPage from './pages/TeamsPage';
// Lazy load large CRM components
const CRMPage = React.lazy(() => import('./pages/CRMPage'));
const EnhancedCRMPage = React.lazy(() => import('./pages/EnhancedCRMPage'));
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import CollectionPage from './pages/CollectionPage';
import CustomReportsPage from './pages/CustomReportsPage';
import ProjectProfitabilityPage from './pages/ProjectProfitabilityPage';

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
      case 'presales':
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
        return hasAccess(['sales', 'finance', 'ceo', 'manager', 'presales']) ? <QuotationsPage /> : <UnauthorizedPage />;
      case '/custom-items':
        return hasAccess(['engineering', 'presales']) ? <CustomItemsPage /> : <UnauthorizedPage />;
      case '/approvals':
        return hasAccess(['manager', 'ceo', 'finance']) ? <ApprovalsPage /> : <UnauthorizedPage />;
      case '/customers':
        return hasAccess(['sales', 'manager', 'admin', 'presales']) ? <CustomersPage /> : <UnauthorizedPage />;
      case '/products':
        return hasAccess(['admin', 'finance', 'engineering', 'presales']) ? <ProductsPage /> : <UnauthorizedPage />;
      case '/commissions':
        return hasAccess(['sales', 'manager', 'ceo', 'finance', 'admin']) ? <CommissionsPage /> : <UnauthorizedPage />;
      case '/targets':
        return hasAccess(['manager', 'ceo', 'finance']) ? <TargetsPage /> : <UnauthorizedPage />;
      case '/teams':
        return hasAccess(['manager']) ? <TeamsPage /> : <UnauthorizedPage />;
      case '/crm':
        return hasAccess(['sales', 'manager', 'ceo', 'presales']) ? <EnhancedCRMPage /> : <UnauthorizedPage />;
      case '/crm-classic':
        return hasAccess(['sales', 'manager', 'ceo', 'presales']) ? <CRMPage /> : <UnauthorizedPage />;
      case '/settings':
        return hasAccess(['admin']) ? <SettingsPage /> : <UnauthorizedPage />;
      case '/notifications':
        return <NotificationsPage />;
      case '/reports':
        return hasAccess(['admin', 'manager', 'ceo']) ? <ReportsPage /> : <UnauthorizedPage />;
      case '/users':
        return hasAccess(['admin']) ? <UsersPage /> : <UnauthorizedPage />;
      case '/purchase-orders':
        return hasAccess(['finance', 'ceo', 'admin', 'engineering', 'presales']) ? <PurchaseOrdersPage /> : <UnauthorizedPage />;
      case '/collection':
        return hasAccess(['sales', 'manager', 'finance', 'ceo', 'admin']) ? <CollectionPage /> : <UnauthorizedPage />;
      case '/custom-reports':
        return hasAccess(['finance', 'ceo', 'admin']) ? <CustomReportsPage /> : <UnauthorizedPage />;
      case '/profitability':
        return hasAccess(['finance', 'ceo', 'admin']) ? <ProjectProfitabilityPage /> : <UnauthorizedPage />;

      default:
        return getDashboardForRole();
    }
  };

  return (
    <Layout>
      <React.Suspense fallback={<SkeletonDashboard />}>
        {getPageContent()}
      </React.Suspense>
    </Layout>
  );
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
