import { useState, useEffect } from 'react';
import {
  Factory, TrendingUp, Clock, AlertCircle, CheckCircle2,
  Users, Package, Wrench, Activity, Calendar, BarChart3
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, subDays } from 'date-fns';
import { useNavigation } from '../contexts/NavigationContext';

interface ProductionMetrics {
  totalJobOrders: number;
  inProduction: number;
  completed: number;
  pendingMaterial: number;
  avgProductionTime: number;
  qualityPassRate: number;
  equipmentUtilization: number;
  activeWorkers: number;
}

interface ProductionAlert {
  id: string;
  type: 'delay' | 'quality' | 'material' | 'equipment';
  message: string;
  job_order_number?: string;
  severity: 'high' | 'medium' | 'low';
}

export default function ProductionDashboard() {
  const { navigate } = useNavigation();
  const [metrics, setMetrics] = useState<ProductionMetrics>({
    totalJobOrders: 0,
    inProduction: 0,
    completed: 0,
    pendingMaterial: 0,
    avgProductionTime: 0,
    qualityPassRate: 0,
    equipmentUtilization: 0,
    activeWorkers: 0,
  });
  const [alerts, setAlerts] = useState<ProductionAlert[]>([]);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [productionLines, setProductionLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

      const [jobOrdersRes, logsRes, linesRes, qualityRes] = await Promise.all([
        supabase
          .from('job_orders')
          .select('*, customer:customers(company_name), quotation:quotations(quotation_number)')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('production_logs')
          .select('*')
          .gte('created_at', weekAgo),
        supabase
          .from('production_lines')
          .select('*')
          .eq('is_active', true),
        supabase
          .from('quality_inspections')
          .select('*')
          .gte('inspection_date', weekAgo),
      ]);

      const jobOrders = jobOrdersRes.data || [];
      const logs = logsRes.data || [];
      const lines = linesRes.data || [];
      const qualityChecks = qualityRes.data || [];

      const inProd = jobOrders.filter(j => j.status === 'in_production').length;
      const completed = jobOrders.filter(j => j.status === 'completed').length;
      const pending = jobOrders.filter(j => j.status === 'pending_material').length;

      const completedLogs = logs.filter(l => l.completed_at);
      const avgTime = completedLogs.length > 0
        ? completedLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) / completedLogs.length
        : 0;

      const passedInspections = qualityChecks.filter(q => q.result === 'pass').length;
      const passRate = qualityChecks.length > 0
        ? Math.round((passedInspections / qualityChecks.length) * 100)
        : 100;

      const utilization = lines.length > 0
        ? Math.round((lines.filter(l => l.current_status === 'running').length / lines.length) * 100)
        : 0;

      setMetrics({
        totalJobOrders: jobOrders.length,
        inProduction: inProd,
        completed,
        pendingMaterial: pending,
        avgProductionTime: Math.round(avgTime),
        qualityPassRate: passRate,
        equipmentUtilization: utilization,
        activeWorkers: lines.reduce((sum, l) => sum + (l.assigned_workers || 0), 0),
      });

      setRecentJobs(jobOrders.slice(0, 5));
      setProductionLines(lines);

      const newAlerts: ProductionAlert[] = [];

      jobOrders.forEach(job => {
        if (job.status === 'pending_material') {
          newAlerts.push({
            id: job.id,
            type: 'material',
            message: `Job ${job.job_order_number} waiting for materials`,
            job_order_number: job.job_order_number,
            severity: 'high',
          });
        }
        if (job.due_date && new Date(job.due_date) < new Date()) {
          newAlerts.push({
            id: job.id,
            type: 'delay',
            message: `Job ${job.job_order_number} overdue`,
            job_order_number: job.job_order_number,
            severity: 'high',
          });
        }
      });

      lines.forEach(line => {
        if (line.current_status === 'maintenance') {
          newAlerts.push({
            id: line.id,
            type: 'equipment',
            message: `${line.line_name} under maintenance`,
            severity: 'medium',
          });
        }
      });

      setAlerts(newAlerts);

    } catch (error) {
      console.error('Error loading production data:', error);
    } finally {
      setLoading(false);
    }
  };

  const metricCards = [
    {
      title: 'Total Job Orders',
      value: metrics.totalJobOrders,
      icon: Factory,
      color: 'blue',
      change: '+12%',
    },
    {
      title: 'In Production',
      value: metrics.inProduction,
      icon: Activity,
      color: 'orange',
      change: '+5%',
    },
    {
      title: 'Completed (7d)',
      value: metrics.completed,
      icon: CheckCircle2,
      color: 'green',
      change: '+8%',
    },
    {
      title: 'Pending Material',
      value: metrics.pendingMaterial,
      icon: Package,
      color: 'amber',
      change: '-3%',
    },
    {
      title: 'Avg Production Time',
      value: `${metrics.avgProductionTime}m`,
      icon: Clock,
      color: 'slate',
      change: '-10%',
    },
    {
      title: 'Quality Pass Rate',
      value: `${metrics.qualityPassRate}%`,
      icon: CheckCircle2,
      color: 'emerald',
      change: '+2%',
    },
    {
      title: 'Equipment Utilization',
      value: `${metrics.equipmentUtilization}%`,
      icon: Wrench,
      color: 'cyan',
      change: '+5%',
    },
    {
      title: 'Active Workers',
      value: metrics.activeWorkers,
      icon: Users,
      color: 'indigo',
      change: '0%',
    },
  ];

  const alertColors = {
    high: 'bg-red-50 border-red-200 text-red-700',
    medium: 'bg-amber-50 border-amber-200 text-amber-700',
    low: 'bg-blue-50 border-blue-200 text-blue-700',
  };

  const alertIcons = {
    delay: Clock,
    quality: AlertCircle,
    material: Package,
    equipment: Wrench,
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
            <Factory className="text-blue-600" size={32} />
            Production Dashboard
          </h1>
          <p className="text-slate-600 mt-1">Monitor and manage production operations</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/production-board')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Production Board
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
                <span className={`text-sm font-medium ${card.change.startsWith('+') ? 'text-green-600' : card.change.startsWith('-') && card.change !== '-3%' ? 'text-green-600' : 'text-red-600'}`}>
                  {card.change}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900">{card.value}</h3>
              <p className="text-sm text-slate-600 mt-1">{card.title}</p>
            </div>
          );
        })}
      </div>

      {alerts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <AlertCircle className="text-red-600" size={20} />
            Production Alerts ({alerts.length})
          </h2>
          <div className="space-y-3">
            {alerts.map((alert) => {
              const Icon = alertIcons[alert.type];
              return (
                <div
                  key={alert.id}
                  className={`flex items-center gap-3 p-4 rounded-lg border ${alertColors[alert.severity]}`}
                >
                  <Icon size={20} />
                  <div className="flex-1">
                    <p className="font-medium">{alert.message}</p>
                    {alert.job_order_number && (
                      <p className="text-sm opacity-75">Job Order: {alert.job_order_number}</p>
                    )}
                  </div>
                  <span className="text-xs font-semibold uppercase">{alert.severity}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Calendar className="text-blue-600" size={20} />
            Recent Job Orders
          </h2>
          <div className="space-y-3">
            {recentJobs.map((job) => (
              <button
                key={job.id}
                onClick={() => navigate('/production-board')}
                className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                <div>
                  <p className="font-medium text-slate-900">{job.job_order_number}</p>
                  <p className="text-sm text-slate-600">
                    {job.customer?.company_name || 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      job.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : job.status === 'in_production'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {job.status.replace(/_/g, ' ')}
                  </span>
                  {job.due_date && (
                    <p className="text-xs text-slate-500 mt-1">
                      Due: {format(new Date(job.due_date), 'MMM d')}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Factory className="text-emerald-600" size={20} />
            Production Lines
          </h2>
          <div className="space-y-3">
            {productionLines.map((line) => (
              <div
                key={line.id}
                className="flex items-center justify-between p-4 rounded-lg border border-slate-200"
              >
                <div>
                  <p className="font-medium text-slate-900">{line.line_name}</p>
                  <p className="text-sm text-slate-600">
                    Workers: {line.assigned_workers || 0} | Capacity: {line.capacity_units_per_hour || 0}/hr
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      line.current_status === 'running'
                        ? 'bg-green-100 text-green-700'
                        : line.current_status === 'idle'
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {line.current_status}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    Efficiency: {line.efficiency_percentage || 0}%
                  </p>
                </div>
              </div>
            ))}
            {productionLines.length === 0 && (
              <p className="text-center text-slate-500 py-8">No active production lines</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <button
          onClick={() => navigate('/quality-inspections')}
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-6 hover:shadow-lg transition-all text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <CheckCircle2 size={28} />
            <BarChart3 size={24} className="opacity-75" />
          </div>
          <h3 className="text-2xl font-bold">{metrics.qualityPassRate}%</h3>
          <p className="text-emerald-100">Quality Pass Rate</p>
        </button>

        <button
          onClick={() => navigate('/production-board')}
          className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 hover:shadow-lg transition-all text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <Activity size={28} />
            <TrendingUp size={24} className="opacity-75" />
          </div>
          <h3 className="text-2xl font-bold">{metrics.inProduction}</h3>
          <p className="text-blue-100">Jobs In Production</p>
        </button>

        <button
          onClick={() => navigate('/production-board')}
          className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl p-6 hover:shadow-lg transition-all text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <Package size={28} />
            <AlertCircle size={24} className="opacity-75" />
          </div>
          <h3 className="text-2xl font-bold">{metrics.pendingMaterial}</h3>
          <p className="text-amber-100">Pending Materials</p>
        </button>
      </div>
    </div>
  );
}
