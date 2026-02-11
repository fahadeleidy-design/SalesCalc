import { useState, useEffect } from 'react';
import {
  CheckCircle2, XCircle, AlertTriangle, TrendingUp, FileCheck,
  Clock, Target, Award, BarChart3, Activity
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, subDays } from 'date-fns';
import { useNavigation } from '../contexts/NavigationContext';

interface QualityMetrics {
  totalInspections: number;
  passed: number;
  failed: number;
  pending: number;
  passRate: number;
  activeAlerts: number;
  avgInspectionTime: number;
  costOfQuality: number;
}

interface InspectionSummary {
  id: string;
  inspection_number: string;
  inspection_type: string;
  result: string;
  inspection_date: string;
  inspector: { full_name: string } | null;
  job_order: { job_order_number: string } | null;
}

interface QualityAlert {
  id: string;
  alert_number: string;
  severity: string;
  status: string;
  description: string;
  created_at: string;
}

export default function QualityDashboard() {
  const { navigate } = useNavigation();
  const [metrics, setMetrics] = useState<QualityMetrics>({
    totalInspections: 0,
    passed: 0,
    failed: 0,
    pending: 0,
    passRate: 0,
    activeAlerts: 0,
    avgInspectionTime: 0,
    costOfQuality: 0,
  });
  const [recentInspections, setRecentInspections] = useState<InspectionSummary[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<QualityAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      const monthAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

      const [inspectionsRes, alertsRes, costsRes] = await Promise.all([
        supabase
          .from('quality_inspections')
          .select('*, inspector:profiles(full_name), job_order:job_orders(job_order_number)')
          .gte('inspection_date', weekAgo)
          .order('inspection_date', { ascending: false }),
        supabase
          .from('quality_alerts')
          .select('*')
          .in('status', ['open', 'investigating'])
          .order('created_at', { ascending: false }),
        supabase
          .from('quality_costs')
          .select('*')
          .gte('cost_date', monthAgo),
      ]);

      const inspections = inspectionsRes.data || [];
      const alerts = alertsRes.data || [];
      const costs = costsRes.data || [];

      const passed = inspections.filter(i => i.result === 'pass').length;
      const failed = inspections.filter(i => i.result === 'fail').length;
      const pending = inspections.filter(i => i.result === 'pending').length;

      const totalCost = costs.reduce((sum, c) => sum + parseFloat(c.cost_amount || 0), 0);

      const completedInspections = inspections.filter(i => i.completed_at);
      const avgTime = completedInspections.length > 0
        ? completedInspections.reduce((sum, insp: any) => {
            const start = new Date(insp.started_at || insp.inspection_date).getTime();
            const end = new Date(insp.completed_at).getTime();
            return sum + ((end - start) / (1000 * 60));
          }, 0) / completedInspections.length
        : 0;

      setMetrics({
        totalInspections: inspections.length,
        passed,
        failed,
        pending,
        passRate: inspections.length > 0 ? Math.round((passed / inspections.length) * 100) : 100,
        activeAlerts: alerts.length,
        avgInspectionTime: Math.round(avgTime),
        costOfQuality: totalCost,
      });

      setRecentInspections(inspections.slice(0, 10));
      setActiveAlerts(alerts.slice(0, 5));

    } catch (error) {
      console.error('Error loading quality data:', error);
    } finally {
      setLoading(false);
    }
  };

  const metricCards = [
    {
      title: 'Total Inspections (7d)',
      value: metrics.totalInspections,
      icon: FileCheck,
      color: 'blue',
      change: '+8%',
    },
    {
      title: 'Passed',
      value: metrics.passed,
      icon: CheckCircle2,
      color: 'green',
      change: '+12%',
    },
    {
      title: 'Failed',
      value: metrics.failed,
      icon: XCircle,
      color: 'red',
      change: '-15%',
    },
    {
      title: 'Pending Review',
      value: metrics.pending,
      icon: Clock,
      color: 'amber',
      change: '+3%',
    },
    {
      title: 'Pass Rate',
      value: `${metrics.passRate}%`,
      icon: Target,
      color: 'emerald',
      change: '+5%',
    },
    {
      title: 'Active Alerts',
      value: metrics.activeAlerts,
      icon: AlertTriangle,
      color: 'orange',
      change: '-8%',
    },
    {
      title: 'Avg Inspection Time',
      value: `${metrics.avgInspectionTime}m`,
      icon: Activity,
      color: 'cyan',
      change: '-10%',
    },
    {
      title: 'Cost of Quality (30d)',
      value: `$${metrics.costOfQuality.toLocaleString()}`,
      icon: BarChart3,
      color: 'slate',
      change: '-5%',
    },
  ];

  const severityColors = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-blue-100 text-blue-700 border-blue-200',
  };

  const resultColors = {
    pass: 'bg-green-100 text-green-700',
    fail: 'bg-red-100 text-red-700',
    pending: 'bg-amber-100 text-amber-700',
    conditional_pass: 'bg-blue-100 text-blue-700',
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Award className="text-emerald-600" size={32} />
            Quality Control Dashboard
          </h1>
          <p className="text-slate-600 mt-1">Monitor quality metrics and inspections</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/quality-inspections')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Inspections
          </button>
          <button
            onClick={() => navigate('/quality-alerts')}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Alerts
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 bg-${card.color}-100 rounded-lg`}>
                  <Icon className={`text-${card.color}-600`} size={24} />
                </div>
                <span className={`text-sm font-medium ${card.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {card.change}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900">{card.value}</h3>
              <p className="text-sm text-slate-600 mt-1">{card.title}</p>
            </div>
          );
        })}
      </div>

      {activeAlerts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="text-orange-600" size={20} />
            Active Quality Alerts ({activeAlerts.length})
          </h2>
          <div className="space-y-3">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${severityColors[alert.severity as keyof typeof severityColors]}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold">{alert.alert_number}</span>
                    <span className="text-xs font-medium uppercase px-2 py-1 bg-white rounded">
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-sm">{alert.description}</p>
                  <p className="text-xs opacity-75 mt-1">
                    {format(new Date(alert.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/quality-alerts')}
                  className="ml-4 px-4 py-2 bg-white hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FileCheck className="text-blue-600" size={20} />
            Recent Inspections
          </h2>
          <div className="space-y-3">
            {recentInspections.map((inspection) => (
              <div
                key={inspection.id}
                className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-medium text-slate-900">{inspection.inspection_number}</p>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        resultColors[inspection.result as keyof typeof resultColors]
                      }`}
                    >
                      {inspection.result}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    {inspection.inspection_type.replace(/_/g, ' ')} |{' '}
                    {inspection.job_order?.job_order_number || 'N/A'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Inspector: {inspection.inspector?.full_name || 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">
                    {format(new Date(inspection.inspection_date), 'MMM d')}
                  </p>
                </div>
              </div>
            ))}
            {recentInspections.length === 0 && (
              <p className="text-center text-slate-500 py-8">No recent inspections</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 className="text-emerald-600" size={20} />
            Quality Metrics
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Pass Rate</span>
                <span className="text-sm font-bold text-emerald-600">{metrics.passRate}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="bg-emerald-600 h-3 rounded-full transition-all"
                  style={{ width: `${metrics.passRate}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Inspections Completed</span>
                <span className="text-sm font-bold text-blue-600">
                  {metrics.passed + metrics.failed} / {metrics.totalInspections}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all"
                  style={{
                    width: `${
                      metrics.totalInspections > 0
                        ? ((metrics.passed + metrics.failed) / metrics.totalInspections) * 100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle2 className="text-green-600 mx-auto mb-2" size={24} />
                  <p className="text-2xl font-bold text-green-900">{metrics.passed}</p>
                  <p className="text-xs text-green-700">Passed</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <XCircle className="text-red-600 mx-auto mb-2" size={24} />
                  <p className="text-2xl font-bold text-red-900">{metrics.failed}</p>
                  <p className="text-xs text-red-700">Failed</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-700">Avg Inspection Time</p>
                  <p className="text-xs text-slate-500">Per inspection</p>
                </div>
                <p className="text-2xl font-bold text-slate-900">{metrics.avgInspectionTime}m</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <button
          onClick={() => navigate('/quality-inspections')}
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-6 hover:shadow-lg transition-all text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <FileCheck size={28} />
            <TrendingUp size={24} className="opacity-75" />
          </div>
          <h3 className="text-2xl font-bold">{metrics.totalInspections}</h3>
          <p className="text-emerald-100">Total Inspections (7d)</p>
        </button>

        <button
          onClick={() => navigate('/quality-alerts')}
          className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-6 hover:shadow-lg transition-all text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <AlertTriangle size={28} />
            <Activity size={24} className="opacity-75" />
          </div>
          <h3 className="text-2xl font-bold">{metrics.activeAlerts}</h3>
          <p className="text-orange-100">Active Alerts</p>
        </button>

        <button
          onClick={() => navigate('/quality-costs')}
          className="bg-gradient-to-br from-slate-500 to-slate-600 text-white rounded-xl p-6 hover:shadow-lg transition-all text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <BarChart3 size={28} />
            <TrendingUp size={24} className="opacity-75" />
          </div>
          <h3 className="text-2xl font-bold">${metrics.costOfQuality.toLocaleString()}</h3>
          <p className="text-slate-100">Cost of Quality (30d)</p>
        </button>
      </div>
    </div>
  );
}
