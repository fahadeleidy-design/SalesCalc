import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SetTargetsForm } from '../components/targets/SetTargetsForm';
import { TargetApprovalList } from '../components/targets/TargetApprovalList';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Target, Plus } from 'lucide-react';

export default function TargetsPage() {
  const { profile } = useAuth();
  const [showSetTargetForm, setShowSetTargetForm] = useState(false);

  // Fetch sales reps for the manager
  const { data: salesReps, isLoading: isLoadingSalesReps } = useQuery({
    queryKey: ['salesReps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'sales')
        .order('full_name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: profile?.role === 'manager',
  });

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Render different views based on role
  if (profile.role === 'manager') {
    if (isLoadingSalesReps) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Target className="h-7 w-7 text-orange-600" />
              Manage Targets
            </h1>
            <p className="text-slate-600 mt-1">Set individual and team sales targets</p>
          </div>
          <button
            onClick={() => setShowSetTargetForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Set New Target
          </button>
        </div>

        {/* Show existing targets here - to be implemented */}
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Target management interface coming soon...</p>
        </div>

        {showSetTargetForm && (
          <SetTargetsForm
            salesReps={salesReps || []}
            onClose={() => setShowSetTargetForm(false)}
          />
        )}
      </div>
    );
  }

  if (profile.role === 'ceo') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Target className="h-7 w-7 text-orange-600" />
            Target Approvals
          </h1>
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
