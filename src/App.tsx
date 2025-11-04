import { useAuth, AuthProvider } from './contexts/AuthContext';
import { useNavigation, NavigationProvider } from './contexts/NavigationContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import SalesDashboard from './pages/SalesDashboard';
import EngineeringDashboard from './pages/EngineeringDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import QuotationsPage from './pages/QuotationsPage';
import CustomItemsPage from './pages/CustomItemsPage';
import ApprovalsPage from './pages/ApprovalsPage';
import CustomersPage from './pages/CustomersPage';
import ProductsPage from './pages/ProductsPage';
import CommissionsPage from './pages/CommissionsPage';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const { currentPath } = useNavigation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
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
      case 'ceo':
      case 'finance':
        return <ManagerDashboard />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <SalesDashboard />;
    }
  };

  const getPageContent = () => {
    switch (currentPath) {
      case '/dashboard':
        return getDashboardForRole();
      case '/quotations':
        return <QuotationsPage />;
      case '/custom-items':
        return <CustomItemsPage />;
      case '/approvals':
        return <ApprovalsPage />;
      case '/customers':
        return <CustomersPage />;
      case '/products':
        return <ProductsPage />;
      case '/commissions':
        return <CommissionsPage />;
      case '/settings':
        return <SettingsPage />;
      case '/notifications':
        return <NotificationsPage />;
      case '/reports':
        return <ReportsPage />;
      case '/users':
        return <UsersPage />;
      default:
        return getDashboardForRole();
    }
  };

  return <Layout>{getPageContent()}</Layout>;
}

function App() {
  return (
    <AuthProvider>
      <NavigationProvider>
        <AppContent />
      </NavigationProvider>
    </AuthProvider>
  );
}

export default App;
