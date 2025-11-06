import React, { useState } from 'react';
import { DollarSign, TrendingUp, Users, Percent, Award, Calendar } from 'lucide-react';
import { useTeamCommissions, useManagerCommission } from '../../hooks/useCommissions';
import { useTeamTargets } from '../../hooks/useTargets';

export function CommissionOverviewDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<{
    start: string;
    end: string;
  } | null>(null);

  // Get all approved team targets (we'll use the first manager's targets as default)
  const { data: teamTargets, isLoading: targetsLoading } = useTeamTargets();
  const approvedTargets = teamTargets?.filter((t) => t.status === 'approved') || [];

  // Set the first target as default if available
  const defaultTarget = approvedTargets[0];
  const periodStart = selectedPeriod?.start || defaultTarget?.period_start || '';
  const periodEnd = selectedPeriod?.end || defaultTarget?.period_end || '';

  // Get team commissions (all sales reps)
  const { data: teamCommissions, isLoading: teamCommissionsLoading } = useTeamCommissions(
    defaultTarget?.manager_id || '',
    periodStart,
    periodEnd
  );

  // Get manager commission
  const { data: managerCommission, isLoading: managerCommissionLoading } = useManagerCommission(
    defaultTarget?.manager_id || '',
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
    if (percentage >= 100) return 'bg-green-100 text-green-800';
    if (percentage >= 90) return 'bg-blue-100 text-blue-800';
    if (percentage >= 80) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  // Calculate totals
  const totalSalesRepCommission = teamCommissions?.reduce((sum, c) => sum + c.commissionAmount, 0) || 0;
  const totalManagerCommission = managerCommission?.commissionAmount || 0;
  const totalCommissionPayout = totalSalesRepCommission + totalManagerCommission;
  const totalTarget = teamCommissions?.reduce((sum, c) => sum + c.targetAmount, 0) || 0;
  const totalAchieved = teamCommissions?.reduce((sum, c) => sum + c.achievedAmount, 0) || 0;
  const overallAchievement = totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0;

  if (targetsLoading || teamCommissionsLoading || managerCommissionLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!approvedTargets || approvedTargets.length === 0) {
    return (
      <div className="text-center py-12">
        <Award className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Commission Data</h3>
        <p className="text-gray-600">
          No approved targets found. Commission data will appear once targets are set and approved.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="h-6 w-6 text-orange-600" />
          <h2 className="text-2xl font-bold text-gray-900">Commission Overview</h2>
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

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Commission Payout */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Total Commission</span>
            <DollarSign className="h-5 w-5" />
          </div>
          <p className="text-3xl font-bold">{formatCurrency(totalCommissionPayout)}</p>
          <p className="text-xs mt-2 opacity-90">
            Sales Reps + Manager
          </p>
        </div>

        {/* Total Target */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Target</span>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalTarget)}</p>
        </div>

        {/* Total Achieved */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Achieved</span>
            <Award className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAchieved)}</p>
        </div>

        {/* Overall Achievement */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Achievement</span>
            <Percent className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{overallAchievement.toFixed(1)}%</p>
        </div>
      </div>

      {/* Commission Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Reps Commission */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Sales Representatives
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Number of Reps</span>
              <span className="text-lg font-semibold text-gray-900">
                {teamCommissions?.length || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Commission</span>
              <span className="text-lg font-semibold text-blue-600">
                {formatCurrency(totalSalesRepCommission)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Commission</span>
              <span className="text-lg font-semibold text-gray-900">
                {formatCurrency(
                  teamCommissions && teamCommissions.length > 0
                    ? totalSalesRepCommission / teamCommissions.length
                    : 0
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Manager Commission */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-600" />
            Sales Manager
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Manager</span>
              <span className="text-lg font-semibold text-gray-900">
                {managerCommission?.userName || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Team Achievement</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getAchievementColor(
                managerCommission?.achievementPercentage || 0
              )}`}>
                {managerCommission?.achievementPercentage.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Commission</span>
              <span className="text-lg font-semibold text-purple-600">
                {formatCurrency(totalManagerCommission)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Sales Rep Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Commission Report</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Target
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Achieved
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Achievement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Commission
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teamCommissions?.map((rep) => (
                <tr key={rep.userId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {rep.userName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    Sales Rep
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(rep.targetAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(rep.achievedAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getAchievementColor(
                      rep.achievementPercentage
                    )}`}>
                      {rep.achievementPercentage.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rep.commissionRate.toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-orange-600">
                    {formatCurrency(rep.commissionAmount)}
                  </td>
                </tr>
              ))}
              {managerCommission && (
                <tr className="bg-purple-50 hover:bg-purple-100">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {managerCommission.userName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    Manager
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(managerCommission.targetAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(managerCommission.achievedAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getAchievementColor(
                      managerCommission.achievementPercentage
                    )}`}>
                      {managerCommission.achievementPercentage.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {managerCommission.commissionRate.toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-purple-600">
                    {formatCurrency(managerCommission.commissionAmount)}
                  </td>
                </tr>
              )}
              <tr className="bg-gray-100 font-bold">
                <td colSpan={6} className="px-6 py-4 text-right text-sm text-gray-900">
                  Total Payout:
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-orange-600">
                  {formatCurrency(totalCommissionPayout)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
