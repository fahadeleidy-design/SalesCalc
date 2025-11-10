import React, { useState, useMemo } from 'react';
import { TrendingUp, Target, DollarSign, Percent, Award, Calendar, AlertCircle } from 'lucide-react';
import { useSalesRepCommission } from '../../hooks/useCommissions';
import { useMyTargets } from '../../hooks/useTargets';
import { useAuth } from '../../contexts/AuthContext';

export function SalesRepCommissionDashboard() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [selectedPeriod, setSelectedPeriod] = useState<{
    start: string;
    end: string;
  } | null>(null);

  // Get all approved targets for this sales rep
  const { data: allTargets, isLoading: targetsLoading } = useMyTargets(user?.id || '');

  // Calculate derived targets based on view mode
  const { targets, derivedFrom } = useMemo(() => {
    if (!allTargets) return { targets: [], derivedFrom: null };

    // First, try to find exact matches for the view mode
    let exactMatches = allTargets.filter(target => {
      if (viewMode === 'monthly') return target.period_type === 'monthly';
      if (viewMode === 'quarterly') return target.period_type === 'quarterly';
      if (viewMode === 'yearly') return target.period_type === 'yearly' || target.period_type === 'half_yearly';
      return false;
    });

    if (exactMatches.length > 0) {
      return { targets: exactMatches, derivedFrom: null };
    }

    // If no exact matches, derive from available targets
    if (viewMode === 'monthly') {
      // Derive monthly from quarterly or yearly
      const quarterly = allTargets.filter(t => t.period_type === 'quarterly');
      const yearly = allTargets.filter(t => t.period_type === 'yearly' || t.period_type === 'half_yearly');

      if (quarterly.length > 0) {
        // Divide quarterly by 3 to get monthly
        const derived = quarterly.map(target => ({
          ...target,
          target_amount: target.target_amount / 3,
          derived: true
        }));
        return { targets: derived, derivedFrom: 'quarterly' };
      } else if (yearly.length > 0) {
        // Divide yearly by 12 to get monthly
        const derived = yearly.map(target => ({
          ...target,
          target_amount: target.target_amount / 12,
          derived: true
        }));
        return { targets: derived, derivedFrom: 'yearly' };
      }
    } else if (viewMode === 'quarterly') {
      // Derive quarterly from monthly or yearly
      const monthly = allTargets.filter(t => t.period_type === 'monthly');
      const yearly = allTargets.filter(t => t.period_type === 'yearly' || t.period_type === 'half_yearly');

      if (monthly.length > 0) {
        // Multiply monthly by 3 to get quarterly
        const derived = monthly.map(target => ({
          ...target,
          target_amount: target.target_amount * 3,
          derived: true
        }));
        return { targets: derived, derivedFrom: 'monthly' };
      } else if (yearly.length > 0) {
        // Divide yearly by 4 to get quarterly
        const derived = yearly.map(target => ({
          ...target,
          target_amount: target.target_amount / 4,
          derived: true
        }));
        return { targets: derived, derivedFrom: 'yearly' };
      }
    } else if (viewMode === 'yearly') {
      // Derive yearly from quarterly or monthly
      const quarterly = allTargets.filter(t => t.period_type === 'quarterly');
      const monthly = allTargets.filter(t => t.period_type === 'monthly');

      if (quarterly.length > 0) {
        // Multiply quarterly by 4 to get yearly
        const derived = quarterly.map(target => ({
          ...target,
          target_amount: target.target_amount * 4,
          derived: true
        }));
        return { targets: derived, derivedFrom: 'quarterly' };
      } else if (monthly.length > 0) {
        // Multiply monthly by 12 to get yearly
        const derived = monthly.map(target => ({
          ...target,
          target_amount: target.target_amount * 12,
          derived: true
        }));
        return { targets: derived, derivedFrom: 'monthly' };
      }
    }

    return { targets: [], derivedFrom: null };
  }, [allTargets, viewMode]);

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

  // Helper functions
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

  // Recalculate achievement percentage and commission based on derived target
  // MUST be called before any conditional returns (Rules of Hooks)
  const recalculatedCommission = useMemo(() => {
    if (!commission || !defaultTarget) return commission;

    const derivedTargetAmount = defaultTarget.target_amount;
    const achievedAmount = commission.achievedAmount;
    const achievementPercentage = derivedTargetAmount > 0
      ? (achievedAmount / derivedTargetAmount) * 100
      : 0;

    let commissionRate = 0;
    if (achievementPercentage >= 100) {
      commissionRate = 3.0;
    } else if (achievementPercentage >= 90) {
      commissionRate = 2.0;
    } else if (achievementPercentage >= 80) {
      commissionRate = 1.5;
    }

    const commissionAmount = (achievedAmount * commissionRate) / 100;

    return {
      ...commission,
      targetAmount: derivedTargetAmount,
      achievementPercentage,
      commissionRate,
      commissionAmount,
    };
  }, [commission, defaultTarget]);

  const tierInfo = recalculatedCommission
    ? getCommissionTierInfo(recalculatedCommission.achievementPercentage)
    : { tier: 'N/A', rate: '0%', color: 'gray' };

  if (targetsLoading || commissionLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const getViewLabel = () => {
    if (viewMode === 'monthly') return 'Monthly';
    if (viewMode === 'quarterly') return 'Quarterly';
    return 'Annual';
  };

  if (!allTargets || allTargets.length === 0) {
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

  if (!targets || targets.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award className="h-6 w-6 text-orange-600" />
            <h2 className="text-2xl font-bold text-gray-900">My Commission</h2>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('monthly')}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
                viewMode === 'monthly'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Monthly</span>
              </div>
            </button>
            <button
              onClick={() => setViewMode('quarterly')}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
                viewMode === 'quarterly'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Quarterly</span>
              </div>
            </button>
            <button
              onClick={() => setViewMode('yearly')}
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
                viewMode === 'yearly'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Annual</span>
              </div>
            </button>
          </div>
        </div>

        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No {getViewLabel()} Targets Set</h3>
          <p className="text-gray-600">
            Your manager hasn't set any {getViewLabel().toLowerCase()} targets for you yet. Try switching to a different view.
          </p>
        </div>
      </div>
    );
  }

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
              } else {
                setSelectedPeriod(null);
              }
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Latest Period</option>
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

      {/* View Mode Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setViewMode('monthly');
              setSelectedPeriod(null);
            }}
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
              viewMode === 'monthly'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Monthly</span>
            </div>
          </button>
          <button
            onClick={() => {
              setViewMode('quarterly');
              setSelectedPeriod(null);
            }}
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
              viewMode === 'quarterly'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Quarterly</span>
            </div>
          </button>
          <button
            onClick={() => {
              setViewMode('yearly');
              setSelectedPeriod(null);
            }}
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
              viewMode === 'yearly'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Annual</span>
            </div>
          </button>
        </div>
      </div>

      {/* Derived Target Info Banner */}
      {derivedFrom && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Calculated Target</h3>
              <p className="text-sm text-blue-700">
                {viewMode === 'monthly' && derivedFrom === 'quarterly' &&
                  'Monthly target calculated by dividing your quarterly target by 3.'}
                {viewMode === 'monthly' && derivedFrom === 'yearly' &&
                  'Monthly target calculated by dividing your annual target by 12.'}
                {viewMode === 'quarterly' && derivedFrom === 'monthly' &&
                  'Quarterly target calculated by multiplying your monthly target by 3.'}
                {viewMode === 'quarterly' && derivedFrom === 'yearly' &&
                  'Quarterly target calculated by dividing your annual target by 4.'}
                {viewMode === 'yearly' && derivedFrom === 'quarterly' &&
                  'Annual target calculated by multiplying your quarterly target by 4.'}
                {viewMode === 'yearly' && derivedFrom === 'monthly' &&
                  'Annual target calculated by multiplying your monthly target by 12.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Target Amount */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Target Amount</span>
            <Target className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {defaultTarget ? formatCurrency(defaultTarget.target_amount) : 'N/A'}
          </p>
          {derivedFrom && (
            <p className="text-xs text-blue-600 mt-1">
              Calculated from {derivedFrom} target
            </p>
          )}
        </div>

        {/* Achieved Amount */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Achieved</span>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {recalculatedCommission ? formatCurrency(recalculatedCommission.achievedAmount) : 'N/A'}
          </p>
        </div>

        {/* Achievement Percentage */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Achievement</span>
            <Percent className="h-5 w-5 text-purple-600" />
          </div>
          <p className={`text-2xl font-bold ${recalculatedCommission ? getAchievementColor(recalculatedCommission.achievementPercentage) : ''}`}>
            {recalculatedCommission ? `${recalculatedCommission.achievementPercentage.toFixed(1)}%` : 'N/A'}
          </p>
        </div>

        {/* Commission Amount */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Your Commission</span>
            <DollarSign className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold">
            {recalculatedCommission ? formatCurrency(recalculatedCommission.commissionAmount) : 'N/A'}
          </p>
          <p className="text-xs mt-2 opacity-90">
            @ {recalculatedCommission?.commissionRate.toFixed(2)}% rate
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
                style={{ width: `${Math.min(recalculatedCommission?.achievementPercentage || 0, 100)}%` }}
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
