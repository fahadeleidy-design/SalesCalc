import React from 'react';
import { DollarSign, TrendingUp, Users, Percent, Award, Calendar } from 'lucide-react';
import { useAllSalesCommissions, useAllManagerCommissions } from '../../hooks/useCommissions';

export function CommissionOverviewDashboard() {
  // Get all sales rep commissions
  const { data: salesCommissions, isLoading: salesLoading } = useAllSalesCommissions();

  // Get all manager commissions
  const { data: managerCommissions, isLoading: managersLoading } = useAllManagerCommissions();

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
  const totalSalesRepCommission = salesCommissions?.reduce((sum, c) => sum + c.commissionAmount, 0) || 0;
  const totalManagerCommission = managerCommissions?.reduce((sum, c) => sum + c.commissionAmount, 0) || 0;
  const totalCommissionPayout = totalSalesRepCommission + totalManagerCommission;
  const totalTarget = salesCommissions?.reduce((sum, c) => sum + c.targetAmount, 0) || 0;
  const totalAchieved = salesCommissions?.reduce((sum, c) => sum + c.achievedAmount, 0) || 0;
  const overallAchievement = totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0;

  if (salesLoading || managersLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const hasAnyCommissionData = (salesCommissions && salesCommissions.length > 0) || (managerCommissions && managerCommissions.length > 0);

  if (!hasAnyCommissionData) {
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

  // Combine all commissions for the detailed table
  const allCommissions = [
    ...(salesCommissions || []),
    ...(managerCommissions || []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="h-6 w-6 text-orange-600" />
          <h2 className="text-2xl font-bold text-gray-900">Commission Overview - All Employees</h2>
        </div>
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
            Sales Reps + Managers
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
                {salesCommissions?.length || 0}
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
                  salesCommissions && salesCommissions.length > 0
                    ? totalSalesRepCommission / salesCommissions.length
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
            Sales Managers
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Number of Managers</span>
              <span className="text-lg font-semibold text-gray-900">
                {managerCommissions?.length || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Commission</span>
              <span className="text-lg font-semibold text-purple-600">
                {formatCurrency(totalManagerCommission)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg Commission</span>
              <span className="text-lg font-semibold text-gray-900">
                {formatCurrency(
                  managerCommissions && managerCommissions.length > 0
                    ? totalManagerCommission / managerCommissions.length
                    : 0
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Commission Table */}
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
                  Period
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
              {allCommissions.map((commission, index) => (
                <tr
                  key={`${commission.userId}-${index}`}
                  className={commission.role === 'manager' ? 'bg-purple-50 hover:bg-purple-100' : 'hover:bg-gray-50'}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {commission.userName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                    {commission.role === 'sales' ? 'Sales Rep' : 'Manager'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(commission.periodStart).toLocaleDateString()} - {new Date(commission.periodEnd).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(commission.targetAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(commission.achievedAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getAchievementColor(
                      commission.achievementPercentage
                    )}`}>
                      {commission.achievementPercentage.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {commission.commissionRate.toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-orange-600">
                    {formatCurrency(commission.commissionAmount)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-bold">
                <td colSpan={7} className="px-6 py-4 text-right text-sm text-gray-900">
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
