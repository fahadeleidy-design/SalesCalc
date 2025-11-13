import React, { useState } from 'react';
import { Users, TrendingUp, Target, DollarSign, Percent, Award, User } from 'lucide-react';
import { useManagerCommission, useTeamCommissions } from '../../hooks/useCommissions';
import { useTeamTargets } from '../../hooks/useTargets';
import { useAuth } from '../../contexts/AuthContext';

export function ManagerCommissionDashboard() {
  const { user, profile } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<{
    start: string;
    end: string;
  } | null>(null);

  // Get all approved team targets for this manager
  const { data: teamTargets, isLoading: targetsLoading } = useTeamTargets(profile?.id || '');
  const approvedTargets = teamTargets?.filter((t) => t.status === 'approved') || [];

  // Set the first target as default if available
  const defaultTarget = approvedTargets[0];
  const periodStart = selectedPeriod?.start || defaultTarget?.period_start || '';
  const periodEnd = selectedPeriod?.end || defaultTarget?.period_end || '';

  // Get manager's commission calculation
  const { data: managerCommission, isLoading: managerCommissionLoading } = useManagerCommission(
    profile?.id || '',
    periodStart,
    periodEnd
  );

  // Get team commissions
  const { data: teamCommissions, isLoading: teamCommissionsLoading } = useTeamCommissions(
    profile?.id || '',
    periodStart,
    periodEnd
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR',
    }).format(amount);
  };

  const getAchievementColor = (percentage: number) => {
    if (percentage >= 100) return 'text-green-600';
    if (percentage >= 90) return 'text-blue-600';
    if (percentage >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-600';
    if (percentage >= 90) return 'bg-blue-600';
    if (percentage >= 80) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  // Calculate team totals
  const teamTotalTarget = teamCommissions?.reduce((sum, c) => sum + c.targetAmount, 0) || 0;
  const teamTotalAchieved = teamCommissions?.reduce((sum, c) => sum + c.achievedAmount, 0) || 0;
  const teamTotalCommission = teamCommissions?.reduce((sum, c) => sum + c.commissionAmount, 0) || 0;

  if (targetsLoading || managerCommissionLoading || teamCommissionsLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!approvedTargets || approvedTargets.length === 0) {
    return (
      <div className="text-center py-12">
        <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Team Targets Set</h3>
        <p className="text-gray-600">
          You haven't set any team targets yet, or they're pending CEO approval.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Award className="h-6 w-6 text-orange-600" />
          <h2 className="text-2xl font-bold text-gray-900">Team Commission Dashboard</h2>
        </div>

        {/* Period Selector */}
        {approvedTargets.length > 1 && (
          <select
            value={selectedPeriod ? `${selectedPeriod.start}_${selectedPeriod.end}` : ''}
            onChange={(e) => {
              if (e.target.value) {
                const [start, end] = e.target.value.split('_');
                setSelectedPeriod({ start, end });
              }
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          >
            {approvedTargets.map((target) => (
              <option
                key={target.id}
                value={`${target.period_start}_${target.period_end}`}
              >
                {new Date(target.period_start).toLocaleDateString()} -{' '}
                {new Date(target.period_end).toLocaleDateString()}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Manager's Commission KPIs */}
      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Award className="h-5 w-5" />
          Your Commission (Manager)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm opacity-90">Team Target</p>
            <p className="text-2xl font-bold">
              {managerCommission ? formatCurrency(managerCommission.targetAmount) : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm opacity-90">Team Achieved</p>
            <p className="text-2xl font-bold">
              {managerCommission ? formatCurrency(managerCommission.achievedAmount) : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm opacity-90">Achievement</p>
            <p className="text-2xl font-bold">
              {managerCommission ? `${managerCommission.achievementPercentage.toFixed(1)}%` : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm opacity-90">Your Commission</p>
            <p className="text-3xl font-bold">
              {managerCommission ? formatCurrency(managerCommission.commissionAmount) : 'N/A'}
            </p>
            <p className="text-xs opacity-75">
              @ {managerCommission?.commissionRate.toFixed(2)}% rate
            </p>
          </div>
        </div>
      </div>

      {/* Team Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Team Target</span>
            <Target className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(teamTotalTarget)}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Team Achieved</span>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(teamTotalAchieved)}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Team Commission</span>
            <DollarSign className="h-5 w-5 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(teamTotalCommission)}</p>
        </div>
      </div>

      {/* Individual Sales Rep Performance */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-orange-600" />
          Individual Sales Rep Performance
        </h3>
        
        {teamCommissions && teamCommissions.length > 0 ? (
          <div className="space-y-4">
            {teamCommissions.map((rep) => (
              <div
                key={rep.userId}
                className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{rep.userName}</h4>
                      <p className="text-sm text-gray-600">Sales Representative</p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getAchievementColor(
                      rep.achievementPercentage
                    )} bg-opacity-10`}
                  >
                    {rep.achievementPercentage.toFixed(1)}%
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-500">Target</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(rep.targetAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Achieved</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(rep.achievedAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Commission Rate</p>
                    <p className="text-sm font-semibold text-gray-900">{rep.commissionRate.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Commission</p>
                    <p className="text-sm font-semibold text-orange-600">
                      {formatCurrency(rep.commissionAmount)}
                    </p>
                  </div>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${getProgressBarColor(rep.achievementPercentage)} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(rep.achievementPercentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No sales rep data available for this period.</p>
          </div>
        )}
      </div>

      {/* Manager Commission Tiers */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Manager Commission Structure</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Team Achievement Range
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Commission Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">0% - 79.99%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">0.00%</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">80% - 89.99%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">0.75%</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">90% - 99.99%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">1.00%</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">100% and above</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">1.20%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
