import { useAuth } from '../contexts/AuthContext';
import CEODashboard from './CEODashboard';

export default function CEOCommercialDashboard() {
  const { profile } = useAuth();

  if (!profile || profile.role !== 'ceo_commercial') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">This dashboard is only available to the CEO Commercial.</p>
        </div>
      </div>
    );
  }

  return <CEODashboard />;
}
