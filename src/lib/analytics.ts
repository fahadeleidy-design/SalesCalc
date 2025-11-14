/**
 * Advanced Analytics and Metrics Calculations
 * Business intelligence and data analysis functions
 */

export interface SalesMetrics {
  totalRevenue: number;
  totalQuotations: number;
  wonDeals: number;
  lostDeals: number;
  pendingDeals: number;
  winRate: number;
  averageDealSize: number;
  conversionRate: number;
  totalCommissions: number;
}

export interface PerformanceMetrics {
  targetAchievement: number;
  quotationsCreated: number;
  averageResponseTime: number;
  customerSatisfaction: number;
  dealVelocity: number;
}

export interface TrendData {
  period: string;
  value: number;
  change: number;
  percentageChange: number;
}

/**
 * Calculate sales metrics
 */
export function calculateSalesMetrics(quotations: any[]): SalesMetrics {
  const wonDeals = quotations.filter(q => q.status === 'deal_won');
  const lostDeals = quotations.filter(q => q.status === 'deal_lost');
  const pendingDeals = quotations.filter(q =>
    !['deal_won', 'deal_lost', 'rejected'].includes(q.status)
  );

  const totalRevenue = wonDeals.reduce((sum, q) => sum + (q.total || 0), 0);
  const totalDeals = wonDeals.length + lostDeals.length;
  const winRate = totalDeals > 0 ? (wonDeals.length / totalDeals) * 100 : 0;
  const averageDealSize = wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0;
  const conversionRate = quotations.length > 0 ? (wonDeals.length / quotations.length) * 100 : 0;

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalQuotations: quotations.length,
    wonDeals: wonDeals.length,
    lostDeals: lostDeals.length,
    pendingDeals: pendingDeals.length,
    winRate: Math.round(winRate * 100) / 100,
    averageDealSize: Math.round(averageDealSize * 100) / 100,
    conversionRate: Math.round(conversionRate * 100) / 100,
    totalCommissions: 0 // Would come from commission_records table
  };
}

/**
 * Calculate performance metrics
 */
export function calculatePerformanceMetrics(
  quotations: any[],
  target: number = 0
): PerformanceMetrics {
  const wonDeals = quotations.filter(q => q.status === 'deal_won');
  const totalRevenue = wonDeals.reduce((sum, q) => sum + (q.total || 0), 0);
  const targetAchievement = target > 0 ? (totalRevenue / target) * 100 : 0;

  // Calculate average response time (draft to first submission)
  const responseTimes = quotations
    .filter(q => q.submitted_at && q.created_at)
    .map(q => {
      const created = new Date(q.created_at).getTime();
      const submitted = new Date(q.submitted_at).getTime();
      return (submitted - created) / (1000 * 60 * 60); // hours
    });

  const averageResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    : 0;

  // Calculate deal velocity (average days to close)
  const dealVelocities = wonDeals
    .filter(q => q.deal_won_at && q.created_at)
    .map(q => {
      const created = new Date(q.created_at).getTime();
      const won = new Date(q.deal_won_at).getTime();
      return (won - created) / (1000 * 60 * 60 * 24); // days
    });

  const dealVelocity = dealVelocities.length > 0
    ? dealVelocities.reduce((sum, days) => sum + days, 0) / dealVelocities.length
    : 0;

  return {
    targetAchievement: Math.round(targetAchievement * 100) / 100,
    quotationsCreated: quotations.length,
    averageResponseTime: Math.round(averageResponseTime * 100) / 100,
    customerSatisfaction: 0, // Would come from feedback table
    dealVelocity: Math.round(dealVelocity * 100) / 100
  };
}

/**
 * Calculate trend data over time
 */
export function calculateTrend(
  data: Array<{ date: string; value: number }>,
  period: 'day' | 'week' | 'month' = 'month'
): TrendData[] {
  if (data.length === 0) return [];

  // Group by period
  const grouped = data.reduce((acc, item) => {
    const date = new Date(item.date);
    let key: string;

    switch (period) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
    }

    if (!acc[key]) {
      acc[key] = { period: key, value: 0, count: 0 };
    }
    acc[key].value += item.value;
    acc[key].count += 1;

    return acc;
  }, {} as Record<string, { period: string; value: number; count: number }>);

  // Convert to array and calculate changes
  const sorted = Object.values(grouped).sort((a, b) => a.period.localeCompare(b.period));

  return sorted.map((item, index) => {
    const previousValue = index > 0 ? sorted[index - 1].value : item.value;
    const change = item.value - previousValue;
    const percentageChange = previousValue > 0 ? (change / previousValue) * 100 : 0;

    return {
      period: item.period,
      value: Math.round(item.value * 100) / 100,
      change: Math.round(change * 100) / 100,
      percentageChange: Math.round(percentageChange * 100) / 100
    };
  });
}

/**
 * Calculate growth rate
 */
export function calculateGrowthRate(
  currentValue: number,
  previousValue: number
): number {
  if (previousValue === 0) return currentValue > 0 ? 100 : 0;
  return ((currentValue - previousValue) / previousValue) * 100;
}

/**
 * Calculate moving average
 */
export function calculateMovingAverage(
  data: number[],
  window: number = 7
): number[] {
  if (data.length < window) return data;

  const result: number[] = [];
  for (let i = 0; i <= data.length - window; i++) {
    const slice = data.slice(i, i + window);
    const avg = slice.reduce((sum, val) => sum + val, 0) / window;
    result.push(Math.round(avg * 100) / 100);
  }

  return result;
}

/**
 * Forecast future values using linear regression
 */
export function forecastLinear(
  data: number[],
  periods: number = 3
): number[] {
  if (data.length < 2) return data;

  // Calculate slope and intercept
  const n = data.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = data.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * data[i], 0);
  const sumX2 = x.reduce((sum, val) => sum + val * val, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Generate forecasts
  const forecasts: number[] = [];
  for (let i = 0; i < periods; i++) {
    const value = slope * (n + i) + intercept;
    forecasts.push(Math.max(0, Math.round(value * 100) / 100));
  }

  return forecasts;
}

/**
 * Calculate customer lifetime value
 */
export function calculateCLV(
  averagePurchaseValue: number,
  purchaseFrequency: number,
  customerLifespan: number
): number {
  return averagePurchaseValue * purchaseFrequency * customerLifespan;
}

/**
 * Calculate customer acquisition cost
 */
export function calculateCAC(
  marketingSpend: number,
  salesSpend: number,
  newCustomers: number
): number {
  if (newCustomers === 0) return 0;
  return (marketingSpend + salesSpend) / newCustomers;
}

/**
 * Calculate return on investment
 */
export function calculateROI(gain: number, cost: number): number {
  if (cost === 0) return 0;
  return ((gain - cost) / cost) * 100;
}

/**
 * Calculate churn rate
 */
export function calculateChurnRate(
  customersStart: number,
  customersEnd: number,
  customersLost: number
): number {
  if (customersStart === 0) return 0;
  return (customersLost / customersStart) * 100;
}

/**
 * Calculate retention rate
 */
export function calculateRetentionRate(
  customersStart: number,
  customersEnd: number,
  customersLost: number
): number {
  return 100 - calculateChurnRate(customersStart, customersEnd, customersLost);
}

/**
 * Segment customers by value
 */
export function segmentCustomers(
  customers: Array<{ id: string; totalSpent: number }>
): {
  high: any[];
  medium: any[];
  low: any[];
} {
  if (customers.length === 0) {
    return { high: [], medium: [], low: [] };
  }

  const sorted = [...customers].sort((a, b) => b.totalSpent - a.totalSpent);
  const totalRevenue = sorted.reduce((sum, c) => sum + c.totalSpent, 0);

  let runningSum = 0;
  const high: any[] = [];
  const medium: any[] = [];
  const low: any[] = [];

  sorted.forEach(customer => {
    runningSum += customer.totalSpent;
    const percentage = (runningSum / totalRevenue) * 100;

    if (percentage <= 80) {
      high.push(customer);
    } else if (percentage <= 95) {
      medium.push(customer);
    } else {
      low.push(customer);
    }
  });

  return { high, medium, low };
}

/**
 * Calculate sales funnel metrics
 */
export function calculateFunnelMetrics(stages: Array<{ stage: string; count: number }>) {
  if (stages.length === 0) return [];

  const total = stages[0].count;
  return stages.map((stage, index) => {
    const conversionFromPrevious = index > 0
      ? (stage.count / stages[index - 1].count) * 100
      : 100;

    const conversionFromStart = (stage.count / total) * 100;

    return {
      ...stage,
      conversionFromPrevious: Math.round(conversionFromPrevious * 100) / 100,
      conversionFromStart: Math.round(conversionFromStart * 100) / 100
    };
  });
}

/**
 * Calculate product performance
 */
export function calculateProductPerformance(
  sales: Array<{ product_id: string; quantity: number; revenue: number }>
) {
  const grouped = sales.reduce((acc, sale) => {
    if (!acc[sale.product_id]) {
      acc[sale.product_id] = { quantity: 0, revenue: 0, count: 0 };
    }
    acc[sale.product_id].quantity += sale.quantity;
    acc[sale.product_id].revenue += sale.revenue;
    acc[sale.product_id].count += 1;
    return acc;
  }, {} as Record<string, { quantity: number; revenue: number; count: number }>);

  return Object.entries(grouped).map(([product_id, data]) => ({
    product_id,
    totalQuantity: data.quantity,
    totalRevenue: Math.round(data.revenue * 100) / 100,
    averageOrderValue: Math.round((data.revenue / data.count) * 100) / 100,
    orderCount: data.count
  }));
}

/**
 * Calculate time-based metrics
 */
export function calculateTimeMetrics(dates: string[]) {
  if (dates.length === 0) return { avgDays: 0, medianDays: 0, minDays: 0, maxDays: 0 };

  const sortedDates = dates.map(d => new Date(d).getTime()).sort((a, b) => a - b);
  const intervals = [];

  for (let i = 1; i < sortedDates.length; i++) {
    const days = (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24);
    intervals.push(days);
  }

  if (intervals.length === 0) return { avgDays: 0, medianDays: 0, minDays: 0, maxDays: 0 };

  const avgDays = intervals.reduce((sum, days) => sum + days, 0) / intervals.length;
  const sortedIntervals = [...intervals].sort((a, b) => a - b);
  const medianDays = sortedIntervals[Math.floor(sortedIntervals.length / 2)];

  return {
    avgDays: Math.round(avgDays * 100) / 100,
    medianDays: Math.round(medianDays * 100) / 100,
    minDays: Math.round(Math.min(...intervals) * 100) / 100,
    maxDays: Math.round(Math.max(...intervals) * 100) / 100
  };
}
