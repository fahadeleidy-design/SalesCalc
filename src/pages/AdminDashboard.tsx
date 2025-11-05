import { useState, useEffect } from 'react';
import { Users, Package, Settings, Activity, FileText, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';
import { supabase } from '../lib/supabase';
import { formatCurrencyCompact } from '../lib/currencyUtils';

export default function AdminDashboard() {
  const { navigate } = useNavigation();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalQuotations: 0,
    totalCustomers: 0,
    pendingApprovals: 0,
    totalRevenue: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [
        usersResult,
        productsResult,
        quotationsResult,
        customersResult,
        pendingResult,
        revenueResult,
        activityResult,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('quotations').select('id', { count: 'exact', head: true }),
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase
          .from('quotations')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending_manager', 'pending_ceo', 'pending_finance']),
        supabase.from('quotations').select('total').eq('status', 'deal_won'),
        supabase
          .from('activity_log')
          .select('*, user:profiles(full_name)')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      const revenue = revenueResult.data?.reduce((sum, q: any) => sum + Number(q.total), 0) || 0;

      setStats({
        totalUsers: usersResult.count || 0,
        totalProducts: productsResult.count || 0,
        totalQuotations: quotationsResult.count || 0,
        totalCustomers: customersResult.count || 0,
        pendingApprovals: pendingResult.count || 0,
        totalRevenue: revenue,
      });

      setRecentActivity(activityResult.data || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('created')) return <FileText className="w-4 h-4 text-orange-500" />;
    if (action.includes('approved')) return <Activity className="w-4 h-4 text-green-600" />;
    if (action.includes('rejected')) return <AlertCircle className="w-4 h-4 text-red-600" />;
    return <Activity className="w-4 h-4 text-slate-600" />;
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-600 mt-1">System management and configuration</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-50 p-3 rounded-lg">
              <Users className="w-6 h-6 text-orange-500" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{stats.totalUsers}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Total Users</h3>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-teal-50 p-3 rounded-lg">
              <Package className="w-6 h-6 text-teal-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{stats.totalProducts}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Products</h3>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{stats.totalQuotations}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Quotations</h3>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-slate-50 p-3 rounded-lg">
              <Users className="w-6 h-6 text-slate-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{stats.totalCustomers}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Customers</h3>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-amber-50 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{stats.pendingApprovals}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Pending</h3>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-emerald-50 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="text-xl font-bold text-slate-900">
              {formatCurrencyCompact(stats.totalRevenue)}
            </span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Revenue</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/customers')}
              className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded">
                  <Users className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Manage Customers</p>
                  <p className="text-sm text-slate-600">View and edit customer database</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => navigate('/products')}
              className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-teal-100 p-2 rounded">
                  <Package className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Manage Products</p>
                  <p className="text-sm text-slate-600">Update product catalog</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded">
                  <Settings className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">System Settings</p>
                  <p className="text-sm text-slate-600">Configure system parameters</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Recent Activity</h3>
          {recentActivity.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"
                >
                  <div className="bg-white p-2 rounded">
                    {getActionIcon(activity.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {(activity.user as any)?.full_name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-slate-600 capitalize">
                      {activity.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{getTimeAgo(activity.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-500 to-teal-500 rounded-xl shadow-sm p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">System Status: Operational</h3>
            <p className="text-blue-100">
              All systems running smoothly. {stats.totalQuotations} quotations processed,{' '}
              {stats.pendingApprovals} pending approval.
            </p>
          </div>
          <div className="bg-white bg-opacity-20 p-4 rounded-lg">
            <TrendingUp className="w-8 h-8" />
          </div>
        </div>
      </div>
    </div>
  );
}
