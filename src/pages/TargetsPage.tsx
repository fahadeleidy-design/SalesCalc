import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SetTargetsForm } from '../components/targets/SetTargetsForm';
import { TargetApprovalList } from '../components/targets/TargetApprovalList';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useApprovedTargets, useSalesRepsWithoutTargets, useTeamTargets } from '../hooks/useTargets';
import { Target, Plus, CheckCircle, Users, Calendar, DollarSign, AlertCircle, Clock, XCircle } from 'lucide-react';

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
    return <ManagerTargetsView profile={profile} />;
  }

  if (profile.role === 'group_ceo' || profile.role === 'ceo_commercial') {
    return <CEOTargetsView />;
  }

  if (profile.role === 'finance') {
    return <FinanceTargetsView />;
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

function ManagerTargetsView({ profile }: { profile: any }) {
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
  });

  // Fetch all targets (sales and team) for this manager
  const { data: salesTargets, isLoading: isLoadingSalesTargets } = useQuery({
    queryKey: ['manager-sales-targets', profile.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_targets')
        .select('*, sales_rep:profiles!sales_targets_sales_rep_id_fkey(full_name, email)')
        .eq('manager_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: teamTargets, isLoading: isLoadingTeamTargets } = useTeamTargets(profile.id);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR',
    }).format(amount);
  };

  const formatPeriodType = (type: string) => {
    const map: Record<string, string> = {
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      half_yearly: 'Half-Yearly',
      yearly: 'Yearly',
    };
    return map[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: any }> = {
      pending_ceo: { bg: 'bg-amber-100', text: 'text-amber-800', icon: Clock },
      approved: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
    };

    const style = styles[status] || styles.pending_ceo;
    const Icon = style.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 ${style.bg} ${style.text} rounded-full text-sm font-medium`}>
        <Icon className="h-4 w-4" />
        {status === 'pending_ceo' ? 'Pending CEO' : status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const isLoading = isLoadingSalesReps || isLoadingSalesTargets || isLoadingTeamTargets;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const approvedSalesTargets = salesTargets?.filter(t => t.status === 'approved') || [];
  const pendingSalesTargets = salesTargets?.filter(t => t.status === 'pending_ceo') || [];
  const approvedTeamTargets = teamTargets?.filter(t => t.status === 'approved') || [];
  const pendingTeamTargets = teamTargets?.filter(t => t.status === 'pending_ceo') || [];

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

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">Approved Sales Targets</span>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{approvedSalesTargets.length}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">Pending Sales Targets</span>
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{pendingSalesTargets.length}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">Approved Team Targets</span>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{approvedTeamTargets.length}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">Pending Team Targets</span>
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{pendingTeamTargets.length}</p>
        </div>
      </div>

      {/* Team Targets Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Users className="h-6 w-6 text-orange-600" />
          Team Targets
        </h2>

        {!teamTargets || teamTargets.length === 0 ? (
          <div className="text-center py-12">
            <Target className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Team Targets Yet</h3>
            <p className="text-slate-600">Click "Set New Target" to create your first team target.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {teamTargets.map((target) => {
              // Calculate sum of individual sales targets for the same period
              const matchingSalesTargets = salesTargets?.filter(
                st => st.status === 'approved' &&
                st.period_start === target.period_start &&
                st.period_end === target.period_end
              ) || [];

              const totalIndividualTargets = matchingSalesTargets.reduce(
                (sum, st) => sum + parseFloat(st.target_amount.toString()),
                0
              );

              const teamTargetAmount = parseFloat(target.target_amount.toString());
              const coverage = teamTargetAmount > 0 ? (totalIndividualTargets / teamTargetAmount) * 100 : 0;
              const gap = teamTargetAmount - totalIndividualTargets;

              return (
                <div
                  key={target.id}
                  className="border border-slate-200 rounded-lg p-5 hover:border-orange-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-lg">
                        {formatPeriodType(target.period_type)} Team Target
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {new Date(target.period_start).toLocaleDateString()} - {new Date(target.period_end).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusBadge(target.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Team Target</p>
                        <p className="text-lg font-semibold text-slate-900">
                          {formatCurrency(teamTargetAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Individual Targets Sum</p>
                        <p className={`text-lg font-semibold ${coverage >= 100 ? 'text-green-600' : 'text-orange-600'}`}>
                          {formatCurrency(totalIndividualTargets)}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {matchingSalesTargets.length} sales rep{matchingSalesTargets.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Coverage</p>
                        <p className={`text-lg font-semibold ${coverage >= 100 ? 'text-green-600' : coverage >= 80 ? 'text-amber-600' : 'text-red-600'}`}>
                          {coverage.toFixed(1)}%
                        </p>
                        {gap !== 0 && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {gap > 0 ? `Gap: ${formatCurrency(gap)}` : `Over: ${formatCurrency(Math.abs(gap))}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {target.notes && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Notes:</p>
                      <p className="text-sm text-slate-700">{target.notes}</p>
                    </div>
                  )}

                  {target.rejection_reason && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg">
                      <p className="text-xs text-red-600 mb-1">Rejection Reason:</p>
                      <p className="text-sm text-red-700">{target.rejection_reason}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Individual Sales Targets Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Target className="h-6 w-6 text-orange-600" />
          Individual Sales Targets
        </h2>

        {!salesTargets || salesTargets.length === 0 ? (
          <div className="text-center py-12">
            <Target className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Sales Targets Yet</h3>
            <p className="text-slate-600">Click "Set New Target" to create targets for your sales reps.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {salesTargets.map((target) => (
              <div
                key={target.id}
                className="border border-slate-200 rounded-lg p-5 hover:border-orange-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {target.sales_rep?.full_name}
                      </h3>
                      <p className="text-sm text-slate-600">{target.sales_rep?.email}</p>
                    </div>
                  </div>
                  {getStatusBadge(target.status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Period Type</p>
                      <p className="text-sm font-medium text-slate-900">
                        {formatPeriodType(target.period_type)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Duration</p>
                      <p className="text-sm font-medium text-slate-900">
                        {new Date(target.period_start).toLocaleDateString()} - {new Date(target.period_end).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Target Amount</p>
                      <p className="text-sm font-semibold text-orange-600">
                        {formatCurrency(target.target_amount)}
                      </p>
                    </div>
                  </div>
                </div>

                {target.notes && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Notes:</p>
                    <p className="text-sm text-slate-700">{target.notes}</p>
                  </div>
                )}

                {target.rejection_reason && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg">
                    <p className="text-xs text-red-600 mb-1">Rejection Reason:</p>
                    <p className="text-sm text-red-700">{target.rejection_reason}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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

function CEOTargetsView() {
  const { data: approvedTargets, isLoading: isLoadingApproved } = useApprovedTargets();
  const { data: salesRepsWithoutTargets, isLoading: isLoadingReps } = useSalesRepsWithoutTargets();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR',
    }).format(amount);
  };

  const formatPeriodType = (type: string) => {
    const map: Record<string, string> = {
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      half_yearly: 'Half-Yearly',
      yearly: 'Yearly',
    };
    return map[type] || type;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Target className="h-7 w-7 text-orange-600" />
          Target Management
        </h1>
        <p className="text-slate-600 mt-1">Review, approve targets, and monitor coverage</p>
      </div>

      {/* Pending Approvals Section */}
      <TargetApprovalList />

      {/* Sales Reps Without Targets Alert */}
      {!isLoadingReps && salesRepsWithoutTargets && salesRepsWithoutTargets.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-amber-600 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-2">
                Sales Reps Without Approved Targets ({salesRepsWithoutTargets.length})
              </h3>
              <p className="text-sm text-amber-700 mb-4">
                The following sales representatives do not have any approved targets. Consider asking their managers to set targets for them.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {salesRepsWithoutTargets.map((rep) => (
                  <div
                    key={rep.id}
                    className="bg-white border border-amber-200 rounded-lg p-4 flex items-center gap-3"
                  >
                    <div className="bg-amber-100 p-2 rounded-lg">
                      <Users className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{rep.full_name}</p>
                      <p className="text-xs text-slate-600 truncate">{rep.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approved Targets Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <CheckCircle className="h-6 w-6 text-green-600" />
          <h2 className="text-xl font-bold text-slate-900">
            Approved Targets ({approvedTargets?.length || 0})
          </h2>
        </div>

        {isLoadingApproved ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          </div>
        ) : !approvedTargets || approvedTargets.length === 0 ? (
          <div className="text-center py-12">
            <Target className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Approved Targets Yet</h3>
            <p className="text-slate-600">Approved targets will appear here once you approve them.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvedTargets.map((target) => (
              <div
                key={target.id}
                className="border border-slate-200 rounded-lg p-5 hover:border-green-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      {target.targetType === 'sales' ? (
                        <Target className="h-5 w-5 text-green-600" />
                      ) : (
                        <Users className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {target.targetType === 'sales'
                          ? `Individual: ${(target as any).sales_rep?.full_name}`
                          : `Team: ${(target as any).manager?.full_name}`}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {target.targetType === 'sales'
                          ? (target as any).sales_rep?.email
                          : (target as any).manager?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      Approved
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Period</p>
                      <p className="text-sm font-medium text-slate-900">
                        {formatPeriodType(target.period_type)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Duration</p>
                      <p className="text-sm font-medium text-slate-900">
                        {new Date(target.period_start).toLocaleDateString()} -{' '}
                        {new Date(target.period_end).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Target Amount</p>
                      <p className="text-sm font-semibold text-green-600">
                        {formatCurrency(target.target_amount)}
                      </p>
                    </div>
                  </div>
                </div>

                {target.approved_at && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs text-slate-500">
                      Approved on {new Date(target.approved_at).toLocaleDateString()} at{' '}
                      {new Date(target.approved_at).toLocaleTimeString()}
                    </p>
                  </div>
                )}

                {target.notes && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Notes:</p>
                    <p className="text-sm text-slate-700">{target.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FinanceTargetsView() {
  const { data: approvedTargets, isLoading: isLoadingApproved } = useApprovedTargets();
  const { data: salesRepsWithoutTargets, isLoading: isLoadingReps } = useSalesRepsWithoutTargets();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR',
    }).format(amount);
  };

  const formatPeriodType = (type: string) => {
    const map: Record<string, string> = {
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      half_yearly: 'Half-Yearly',
      yearly: 'Yearly',
    };
    return map[type] || type;
  };

  // Calculate total targets
  const totalTargetAmount = approvedTargets?.reduce((sum, target) => sum + Number(target.target_amount), 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Target className="h-7 w-7 text-orange-600" />
          Sales Targets Overview
        </h1>
        <p className="text-slate-600 mt-1">Monitor all sales targets and coverage for financial planning</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="text-sm font-medium text-slate-600">Total Target Amount</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalTargetAmount)}</p>
          <p className="text-xs text-slate-500 mt-1">All approved targets</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-slate-600">Active Targets</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">{approvedTargets?.length || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Sales reps with targets</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <h3 className="text-sm font-medium text-slate-600">Without Targets</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">{salesRepsWithoutTargets?.length || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Sales reps pending targets</p>
        </div>
      </div>

      {/* Sales Reps Without Targets Alert */}
      {!isLoadingReps && salesRepsWithoutTargets && salesRepsWithoutTargets.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-amber-600 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-2">
                Sales Reps Without Approved Targets ({salesRepsWithoutTargets.length})
              </h3>
              <p className="text-sm text-amber-700 mb-4">
                The following sales representatives do not have any approved targets. This may affect commission calculations and financial forecasting.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {salesRepsWithoutTargets.map((rep) => (
                  <div
                    key={rep.id}
                    className="bg-white border border-amber-200 rounded-lg p-4 flex items-center gap-3"
                  >
                    <div className="bg-amber-100 p-2 rounded-lg">
                      <Users className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{rep.full_name}</p>
                      <p className="text-xs text-slate-600 truncate">{rep.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Approved Targets Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Target className="h-6 w-6 text-orange-600" />
          All Sales Targets
        </h2>

        {isLoadingApproved ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : !approvedTargets || approvedTargets.length === 0 ? (
          <div className="text-center py-12">
            <Target className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Approved Targets Yet</h3>
            <p className="text-slate-600">Targets will appear here once they are approved by management.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvedTargets.map((target) => (
              <div
                key={target.id}
                className="border border-slate-200 rounded-lg p-5 hover:border-orange-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {target.sales_rep?.full_name}
                      </h3>
                      <p className="text-sm text-slate-600">{target.sales_rep?.email}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <CheckCircle className="w-3 h-3" />
                    Approved
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Period Type</p>
                      <p className="text-sm font-medium text-slate-900">
                        {formatPeriodType(target.period_type)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Period</p>
                      <p className="text-sm font-medium text-slate-900">
                        {new Date(target.period_start).toLocaleDateString()} - {new Date(target.period_end).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Target Amount</p>
                      <p className="text-sm font-semibold text-green-600">
                        {formatCurrency(target.target_amount)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <Users className="h-3 w-3" />
                  <span>Set by: {target.manager?.full_name}</span>
                </div>

                {target.approved_at && (
                  <div className="mt-2 pt-3 border-t border-slate-200">
                    <p className="text-xs text-slate-500">
                      Approved on {new Date(target.approved_at).toLocaleDateString()} at{' '}
                      {new Date(target.approved_at).toLocaleTimeString()}
                    </p>
                  </div>
                )}

                {target.notes && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Notes:</p>
                    <p className="text-sm text-slate-700">{target.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
