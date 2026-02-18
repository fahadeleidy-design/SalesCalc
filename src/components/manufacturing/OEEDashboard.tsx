import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Activity, TrendingUp, TrendingDown, Clock, AlertTriangle,
  Settings, Gauge, CheckCircle, BarChart3, Factory, Loader2,
  Wrench, CalendarClock, Filter, Inbox
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  useOEEMetrics,
  useDowntimeEvents,
  useWorkCenters,
  useMachineMaintenance,
} from '../../hooks/useManufacturing';

const CATEGORY_COLORS: Record<string, string> = {
  mechanical: '#ef4444',
  electrical: '#f59e0b',
  material: '#8b5cf6',
  operator: '#ec4899',
  quality: '#14b8a6',
  changeover: '#f97316',
  planned: '#3b82f6',
  other: '#6b7280',
};

function CircularGauge({ value, size = 120, strokeWidth = 10, color }: { value: number; size?: number; strokeWidth?: number; color: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
    </svg>
  );
}

function GaugeCard({ title, value, color, colorHex, icon: Icon }: {
  title: string; value: number; color: string; colorHex: string; icon: React.ElementType;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
        <Icon className="w-4 h-4" />
        <span>{title}</span>
      </div>
      <div className="relative flex items-center justify-center">
        <CircularGauge value={value} color={colorHex} />
        <span className={`absolute text-2xl font-bold text-${color}-600`}>{value.toFixed(1)}%</span>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
      <Inbox className="w-10 h-10 mb-2" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function getBarColor(value: number) {
  if (value >= 80) return '#22c55e';
  if (value >= 60) return '#eab308';
  return '#ef4444';
}

function severityBadge(severity: string) {
  const map: Record<string, string> = {
    minor: 'bg-slate-100 text-slate-600',
    moderate: 'bg-amber-100 text-amber-700',
    major: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  };
  return map[severity] ?? 'bg-slate-100 text-slate-600';
}

function maintenanceStatusBadge(status: string) {
  const map: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-amber-100 text-amber-700',
    completed: 'bg-emerald-100 text-emerald-700',
    overdue: 'bg-red-100 text-red-700',
    cancelled: 'bg-slate-100 text-slate-500',
  };
  return map[status] ?? 'bg-slate-100 text-slate-600';
}

export default function OEEDashboard() {
  const [selectedWorkCenter, setSelectedWorkCenter] = useState<string>('');

  const wcFilter = selectedWorkCenter || undefined;
  const { data: workCenters = [], isLoading: wcLoading } = useWorkCenters();
  const { data: oeeMetrics = [], isLoading: oeeLoading } = useOEEMetrics(wcFilter);
  const { data: downtimeEvents = [], isLoading: dtLoading } = useDowntimeEvents(wcFilter);
  const { data: maintenance = [], isLoading: maintLoading } = useMachineMaintenance(wcFilter);

  const isLoading = wcLoading || oeeLoading || dtLoading || maintLoading;

  const avgMetrics = useMemo(() => {
    if (oeeMetrics.length === 0) return { oee: 0, availability: 0, performance: 0, quality: 0 };
    const sum = oeeMetrics.reduce(
      (acc, m) => ({
        oee: acc.oee + m.oee_percentage,
        availability: acc.availability + m.availability_rate,
        performance: acc.performance + m.performance_rate,
        quality: acc.quality + m.quality_rate,
      }),
      { oee: 0, availability: 0, performance: 0, quality: 0 }
    );
    const n = oeeMetrics.length;
    return { oee: sum.oee / n, availability: sum.availability / n, performance: sum.performance / n, quality: sum.quality / n };
  }, [oeeMetrics]);

  const trendData = useMemo(() => {
    const byDate = new Map<string, { availability: number[]; performance: number[]; quality: number[]; oee: number[] }>();
    oeeMetrics.forEach((m) => {
      const key = m.measurement_date;
      if (!byDate.has(key)) byDate.set(key, { availability: [], performance: [], quality: [], oee: [] });
      const entry = byDate.get(key)!;
      entry.availability.push(m.availability_rate);
      entry.performance.push(m.performance_rate);
      entry.quality.push(m.quality_rate);
      entry.oee.push(m.oee_percentage);
    });
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        date: format(parseISO(date), 'MMM d'),
        availability: +avg(vals.availability).toFixed(1),
        performance: +avg(vals.performance).toFixed(1),
        quality: +avg(vals.quality).toFixed(1),
        oee: +avg(vals.oee).toFixed(1),
      }));
  }, [oeeMetrics]);

  const workCenterComparison = useMemo(() => {
    const byWc = new Map<string, { name: string; values: number[] }>();
    oeeMetrics.forEach((m) => {
      const id = m.work_center_id;
      if (!byWc.has(id)) byWc.set(id, { name: m.work_center?.work_center_name ?? id, values: [] });
      byWc.get(id)!.values.push(m.oee_percentage);
    });
    return Array.from(byWc.values()).map((entry) => ({
      name: entry.name,
      oee: +(entry.values.reduce((a, b) => a + b, 0) / entry.values.length).toFixed(1),
    }));
  }, [oeeMetrics]);

  const downtimeByCategory = useMemo(() => {
    const map = new Map<string, number>();
    downtimeEvents.forEach((e) => {
      map.set(e.downtime_category, (map.get(e.downtime_category) ?? 0) + (e.duration_minutes ?? 0));
    });
    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value: +value.toFixed(0),
      color: CATEGORY_COLORS[name] ?? '#6b7280',
    }));
  }, [downtimeEvents]);

  const topDowntimeEvents = useMemo(() => {
    return [...downtimeEvents]
      .sort((a, b) => (b.duration_minutes ?? 0) - (a.duration_minutes ?? 0))
      .slice(0, 5);
  }, [downtimeEvents]);

  const pendingMaintenance = useMemo(() => {
    return maintenance.filter((m) => m.status === 'scheduled' || m.status === 'overdue' || m.status === 'in_progress');
  }, [maintenance]);

  if (isLoading) {
    return (
      <div className="p-6 bg-slate-50 min-h-screen">
        <div className="flex items-center gap-3 mb-6">
          <Factory className="w-7 h-7 text-slate-700" />
          <h1 className="text-2xl font-bold text-slate-800">OEE Dashboard</h1>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Factory className="w-7 h-7 text-slate-700" />
          <h1 className="text-2xl font-bold text-slate-800">OEE Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={selectedWorkCenter}
            onChange={(e) => setSelectedWorkCenter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <option value="">All Work Centers</option>
            {workCenters.map((wc) => (
              <option key={wc.id} value={wc.id}>{wc.work_center_name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GaugeCard title="Overall OEE" value={avgMetrics.oee} color="slate" colorHex="#475569" icon={Gauge} />
        <GaugeCard title="Availability" value={avgMetrics.availability} color="emerald" colorHex="#22c55e" icon={Activity} />
        <GaugeCard title="Performance" value={avgMetrics.performance} color="blue" colorHex="#3b82f6" icon={TrendingUp} />
        <GaugeCard title="Quality" value={avgMetrics.quality} color="teal" colorHex="#14b8a6" icon={CheckCircle} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" /> OEE Trend
        </h2>
        {trendData.length === 0 ? <EmptyState message="No OEE trend data available" /> : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0' }} />
              <Area type="monotone" dataKey="availability" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} name="Availability %" />
              <Area type="monotone" dataKey="performance" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} name="Performance %" />
              <Area type="monotone" dataKey="quality" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.15} name="Quality %" />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {!selectedWorkCenter && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" /> Work Center OEE Comparison
          </h2>
          {workCenterComparison.length === 0 ? <EmptyState message="No work center data available" /> : (
            <ResponsiveContainer width="100%" height={Math.max(200, workCenterComparison.length * 50)}>
              <BarChart data={workCenterComparison} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={140} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0' }} />
                <Bar dataKey="oee" radius={[0, 6, 6, 0]} name="OEE %">
                  {workCenterComparison.map((entry, idx) => (
                    <Cell key={idx} fill={getBarColor(entry.oee)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" /> Downtime by Category
          </h2>
          {downtimeByCategory.length === 0 ? <EmptyState message="No downtime events recorded" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={downtimeByCategory} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={3}
                  label={({ name, value }) => `${name} (${value}m)`}>
                  {downtimeByCategory.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0' }} formatter={(val: number) => `${val} min`} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Top Downtime Events
          </h2>
          {topDowntimeEvents.length === 0 ? <EmptyState message="No downtime events recorded" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Work Center</th>
                    <th className="pb-2 font-medium">Duration</th>
                    <th className="pb-2 font-medium">Category</th>
                    <th className="pb-2 font-medium">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {topDowntimeEvents.map((evt) => (
                    <tr key={evt.id} className="border-b border-slate-100 text-slate-700">
                      <td className="py-2">{format(parseISO(evt.start_time), 'MMM d, yyyy')}</td>
                      <td className="py-2">{evt.work_center?.work_center_name ?? 'N/A'}</td>
                      <td className="py-2 font-medium text-red-600">
                        {evt.duration_minutes != null ? `${(evt.duration_minutes / 60).toFixed(1)} hrs` : 'Ongoing'}
                      </td>
                      <td className="py-2">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 capitalize">{evt.downtime_category}</span>
                      </td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${severityBadge(evt.impact_level)}`}>{evt.impact_level}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Wrench className="w-5 h-5" /> Maintenance Schedule
        </h2>
        {pendingMaintenance.length === 0 ? <EmptyState message="No upcoming or overdue maintenance tasks" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2 font-medium">Title</th>
                  <th className="pb-2 font-medium">Work Center</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Scheduled</th>
                  <th className="pb-2 font-medium">Priority</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {pendingMaintenance.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100 text-slate-700">
                    <td className="py-2.5 font-medium">{m.maintenance_code ?? m.maintenance_type}</td>
                    <td className="py-2.5">{m.work_center?.work_center_name ?? 'N/A'}</td>
                    <td className="py-2.5 capitalize">{m.maintenance_type}</td>
                    <td className="py-2.5 flex items-center gap-1.5">
                      <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
                      {format(parseISO(m.scheduled_date), 'MMM d, yyyy')}
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        m.priority === 'critical' ? 'bg-red-100 text-red-700' :
                        m.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        m.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{m.priority}</span>
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${maintenanceStatusBadge(m.status)}`}>
                        {m.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
