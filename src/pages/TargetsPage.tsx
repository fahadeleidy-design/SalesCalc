import { useAuth } from '../contexts/AuthContext';
import { SetTargetsForm } from '../components/targets/SetTargetsForm';
import { TargetApprovalList } from '../components/targets/TargetApprovalList';

export default function TargetsPage() {
  const { profile } = useAuth();

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Render different views based on role
  if (profile.role === 'manager') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Targets</h1>
          <p className="text-slate-600 mt-1">Set individual and team sales targets</p>
        </div>
        <SetTargetsForm />
      </div>
    );
  }

  if (profile.role === 'ceo') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Target Approvals</h1>
          <p className="text-slate-600 mt-1">Review and approve sales targets</p>
        </div>
        <TargetApprovalList />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-96">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-600">You don't have permission to access this page.</p>
      </div>
    </div>
  );
}
