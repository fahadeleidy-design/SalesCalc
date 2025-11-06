import React, { useState, useMemo } from 'react';
import { TrendingUp, Target, DollarSign, Percent, Award, Calendar } from 'lucide-react';
import { useSalesRepCommission } from '../../hooks/useCommissions';
import { useMyTargets } from '../../hooks/useTargets';
import { useAuth } from '../../contexts/AuthContext';

export function SalesRepCommissionDashboard() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<{
    start: string;
    end: string;
  } | null>(null);

  // Get all approved targets for this sales rep
  const { data: targets, isLoading: targetsLoading } = useMyTargets(user?.id || '');

  // Set the first target as default if available
  const defaultTarget = targets?.[0];
  const periodStart = selectedPeriod?.start || defaultTarget?.period_start || '';
  const periodEnd = selectedPeriod?.end || defaultTarget?.period_end || '';

  // Get commission calculation
  const { data: commission, isLoading: commissionLoading } = useSalesRepCommission(
    user?.id || '',
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
    if (percentage >= 100) return 'text-green-600 bg-green-100';
    if (percentage >= 90) return 'text-blue-600 bg-blue-100';
    if (percentage >= 80) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getCommissionTierInfo = (percentage: number) => {
    if (percentage >= 100) return { tier: 'Platinum', rate: '3.0%', color: 'green' };
    if (percentage >= 90) return { tier: 'Gold', rate: '2.0%', color: 'blue' };
    if (percentage >= 80) return { tier: 'Silver', rate: '1.5%', color: 'yellow' };
    return { tier: 'No Commission', rate: '0.0%', color: 'red' };
  };

  if (targetsLoading || commissionLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!targets || targets.length === 0) {
    return (
      <div className="text-center py-12">
        <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Targets Set</h3>
        <p className="text-gray-600">
          Your manager hasn't set any targets for you yet. Check back later!
        </p>
      </div>
    );
  }

  const tierInfo = commission
    ? getCommissionTierInfo(commission.achievementPercentage)
    : { tier: 'N/A', rate: '0%', color: 'gray' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Award className="h-6 w-6 text-orange-600" />
          <h2 className="text-2xl font-bold text-gray-900">My Commission</h2>
        </div>

        {/* Period Selector */}
        {targets.length > 1 && (
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
            {targets.map((target) => (
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Target Amount */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Target Amount</span>
            <Target className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {commission ? formatCurrency(commission.targetAmount) : 'N/A'}
          </p>
        </div>

        {/* Achieved Amount */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Achieved</span>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {commission ? formatCurrency(commission.achievedAmount) : 'N/A'}
          </p>
        </div>

        {/* Achievement Percentage */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Achievement</span>
            <Percent className="h-5 w-5 text-purple-600" />
          </div>
          <p className={`text-2xl font-bold ${commission ? getAchievementColor(commission.achievementPercentage) : ''}`}>
            {commission ? `${commission.achievementPercentage.toFixed(1)}%` : 'N/A'}
          </p>
        </div>

        {/* Commission Amount */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Your Commission</span>
            <DollarSign className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold">
            {commission ? formatCurrency(commission.commissionAmount) : 'N/A'}
          </p>
          <p className="text-xs mt-2 opacity-90">
            @ {commission?.commissionRate.toFixed(2)}% rate
          </p>
        </div>
      </div>

      {/* Commission Tier Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Commission Tier</h3>
        <div className="flex items-center gap-4">
          <div className={`px-6 py-3 bg-${tierInfo.color}-100 text-${tierInfo.color}-800 rounded-lg`}>
            <p className="text-sm font-medium">Current Tier</p>
            <p className="text-2xl font-bold">{tierInfo.tier}</p>
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-2">Commission Rate: {tierInfo.rate}</p>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`bg-${tierInfo.color}-600 h-3 rounded-full transition-all duration-500`}
                style={{ width: `${Math.min(commission?.achievementPercentage || 0, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Commission Tiers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Commission Structure</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Achievement Range
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Commission Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tier
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">0% - 79.99%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">0.00%</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                    No Commission
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">80% - 89.99%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">1.50%</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                    Silver
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">90% - 99.99%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">2.00%</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    Gold
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">100% and above</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">3.00%</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    Platinum
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
