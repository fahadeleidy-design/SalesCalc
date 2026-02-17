import { useAuth } from '../contexts/AuthContext';
import { SalesRepCommissionDashboard } from '../components/commissions/SalesRepCommissionDashboard';
import { ManagerCommissionDashboard } from '../components/commissions/ManagerCommissionDashboard';
import { CommissionOverviewDashboard } from '../components/commissions/CommissionOverviewDashboard';
import { CommissionTiersManager } from '../components/admin/CommissionTiersManager';

export default function CommissionsPage() {
  const { profile } = useAuth();

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Render different commission views based on role
  switch (profile.role) {
    case 'sales':
      return <SalesRepCommissionDashboard />;
    
    case 'manager':
      return <ManagerCommissionDashboard />;
    
    case 'group_ceo':
    case 'ceo_commercial':
    case 'finance':
      return <CommissionOverviewDashboard />;
    
    case 'admin':
      return <CommissionTiersManager />;
    
    default:
      return (
        <div className="flex flex-col items-center justify-center h-96">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-slate-600">You don't have permission to access this page.</p>
          </div>
        </div>
      );
  }
}
