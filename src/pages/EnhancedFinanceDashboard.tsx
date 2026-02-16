import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  CreditCard,
  Building2,
  Calculator,
  PieChart,
  BarChart3,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Users,
  Package,
  Settings,
} from 'lucide-react';
import { useFinanceMetrics, useChartOfAccounts, useFiscalPeriods, useARAgingReport } from '../hooks/useFinance';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function EnhancedFinanceDashboard() {
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current_month');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');

  const { data: metrics, isLoading: metricsLoading } = useFinanceMetrics();
  const { data: accounts } = useChartOfAccounts();
  const { data: fiscalPeriods } = useFiscalPeriods(2026);
  const { data: arAging } = useARAgingReport();

  const currentPeriod = fiscalPeriods?.find(p => !p.is_closed);

  const metricCards = [
    {
      title: 'Total Revenue',
      value: metrics?.total_revenue || 0,
      change: 12.5,
      trend: 'up',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Total Expenses',
      value: metrics?.total_cost || 0,
      change: 8.3,
      trend: 'up',
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Net Profit',
      value: (metrics?.total_revenue || 0) - (metrics?.total_cost || 0),
      change: 15.2,
      trend: 'up',
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Profit Margin',
      value: metrics?.average_profit_margin || 0,
      change: 2.1,
      trend: 'up',
      icon: PieChart,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      isPercentage: true,
    },
    {
      title: 'Accounts Receivable',
      value: arAging?.reduce((sum: number, item: any) => sum + item.total_due, 0) || 0,
      change: -5.4,
      trend: 'down',
      icon: CreditCard,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Cash Position',
      value: 0,
      change: 8.7,
      trend: 'up',
      icon: Wallet,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
  ];

  const quickActions = [
    { label: 'Journal Entry', icon: FileText, href: '/finance/journal-entries', color: 'bg-blue-500' },
    { label: 'Credit Note', icon: CreditCard, href: '/finance/credit-notes', color: 'bg-green-500' },
    { label: 'Debit Note', icon: FileText, href: '/finance/debit-notes', color: 'bg-orange-500' },
    { label: 'Fixed Asset', icon: Building2, href: '/finance/fixed-assets', color: 'bg-purple-500' },
    { label: 'Write-Off', icon: AlertTriangle, href: '/finance/write-offs', color: 'bg-red-500' },
    { label: 'Financial Statement', icon: BarChart3, href: '/finance/statements', color: 'bg-indigo-500' },
  ];

  const moduleLinks = [
    { label: 'General Ledger', icon: Calculator, href: '/finance/general-ledger', description: 'Chart of accounts, journal entries' },
    { label: 'Accounts Receivable', icon: TrendingUp, href: '/finance/accounts-receivable', description: 'Invoices, credit notes, aging' },
    { label: 'Accounts Payable', icon: TrendingDown, href: '/finance/accounts-payable', description: 'Vendor bills, debit notes, aging' },
    { label: 'Fixed Assets', icon: Building2, href: '/finance/fixed-assets', description: 'Asset register, depreciation' },
    { label: 'Cost Centers', icon: Package, href: '/finance/cost-centers', description: 'Budget vs actual, allocations' },
    { label: 'Financial Statements', icon: BarChart3, href: '/finance/statements', description: 'Balance sheet, P&L, cash flow' },
    { label: 'Fiscal Periods', icon: Calendar, href: '/finance/fiscal-periods', description: 'Period management, closures' },
    { label: 'Multi-Currency', icon: DollarSign, href: '/finance/currencies', description: 'Exchange rates, foreign currency' },
    { label: 'Tax Management', icon: FileText, href: '/finance/tax', description: 'Tax codes, jurisdictions' },
    { label: 'Settings', icon: Settings, href: '/finance/settings', description: 'Payment terms, configurations' },
  ];

  const recentTransactions = [
    { id: 1, type: 'Journal Entry', number: 'JE-2026-001', date: '2026-02-15', amount: 50000, status: 'Posted' },
    { id: 2, type: 'Credit Note', number: 'CN-2026-003', date: '2026-02-14', amount: -2500, status: 'Approved' },
    { id: 3, type: 'Journal Entry', number: 'JE-2026-002', date: '2026-02-13', amount: 35000, status: 'Posted' },
    { id: 4, type: 'Debit Note', number: 'DN-2026-001', date: '2026-02-12', amount: -1200, status: 'Applied' },
  ];

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finance Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive financial management and accounting
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="current_month">Current Month</option>
            <option value="last_month">Last Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            {currentPeriod?.period_name || 'Select Period'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {metricCards.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {metric.isPercentage
                      ? `${metric.value.toFixed(1)}%`
                      : `${metric.value.toLocaleString('en-US', { style: 'currency', currency: 'SAR' })}`}
                  </p>
                  <div className="flex items-center mt-2">
                    {metric.trend === 'up' ? (
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-sm ml-1 ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.abs(metric.change)}%
                    </span>
                  </div>
                </div>
                <div className={`${metric.bgColor} p-3 rounded-lg`}>
                  <Icon className={`h-6 w-6 ${metric.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
            <Button variant="outline" size="sm">View All</Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={() => window.location.href = action.href}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all group"
                >
                  <div className={`${action.color} w-12 h-12 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">{action.label}</p>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Period Status</h2>
            <Clock className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">Current Period</span>
                <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full">Open</span>
              </div>
              <p className="text-lg font-bold text-blue-900">{currentPeriod?.period_name}</p>
              <p className="text-sm text-blue-700 mt-1">
                {currentPeriod?.start_date} - {currentPeriod?.end_date}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Journal Entries</span>
                <span className="text-sm font-medium text-gray-900">45</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Posted Entries</span>
                <span className="text-sm font-medium text-green-600">42</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Draft Entries</span>
                <span className="text-sm font-medium text-orange-600">3</span>
              </div>
            </div>

            <Button className="w-full mt-4" variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Close Period
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Transactions</h2>
            <Button variant="outline" size="sm">View All</Button>
          </div>
          <div className="space-y-3">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{transaction.number}</span>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {transaction.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{transaction.date}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.amount.toLocaleString('en-US', { style: 'currency', currency: 'SAR' })}
                  </p>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full mt-1 inline-block">
                    {transaction.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">AR Aging Summary</h2>
            <Button variant="outline" size="sm">Detailed Report</Button>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Current (0-30 days)', amount: 125000, percentage: 45, color: 'bg-green-500' },
              { label: '31-60 days', amount: 75000, percentage: 27, color: 'bg-yellow-500' },
              { label: '61-90 days', amount: 45000, percentage: 16, color: 'bg-orange-500' },
              { label: 'Over 90 days', amount: 32000, percentage: 12, color: 'bg-red-500' },
            ].map((bucket, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{bucket.label}</span>
                  <span className="text-sm font-bold text-gray-900">
                    {bucket.amount.toLocaleString('en-US', { style: 'currency', currency: 'SAR' })}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${bucket.color} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${bucket.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Total Outstanding</span>
              <span className="text-lg font-bold text-gray-900">
                277,000.00 SAR
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Finance Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {moduleLinks.map((module, index) => {
            const Icon = module.icon;
            return (
              <button
                key={index}
                onClick={() => window.location.href = module.href}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all text-left group"
              >
                <Icon className="h-8 w-8 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-medium text-gray-900 mb-1">{module.label}</h3>
                <p className="text-xs text-gray-600">{module.description}</p>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-yellow-100 p-2 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <h3 className="font-medium text-gray-900">Pending Approvals</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Write-Offs</span>
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">3</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Credit Notes</span>
              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">2</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Journal Entries</span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">1</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-100 p-2 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="font-medium text-gray-900">Compliance Status</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Tax Filing</span>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Financial Statements</span>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Audit Trail</span>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-medium text-gray-900">Team Activity</h3>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• 45 journal entries this month</p>
            <p>• 12 credit notes processed</p>
            <p>• 3 financial statements generated</p>
            <p>• 8 fixed assets registered</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
