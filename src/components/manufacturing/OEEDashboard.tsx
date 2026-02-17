import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import {
  Activity, TrendingUp, TrendingDown, Clock, AlertTriangle,
  Settings, Gauge, CheckCircle, BarChart3, Factory
} from 'lucide-react';

const oeeTrend = Array.from({ length: 30 }, (_, i) => ({
  date: `Feb ${i + 1}`,
  availability: 85 + Math.random() * 10,
  performance: 88 + Math.random() * 8,
  quality: 94 + Math.random() * 5,
  oee: 0
})).map(d => ({ ...d, oee: (d.availability * d.performance * d.quality) / 10000 }));

const workCenterData = [
  { name: 'Assembly Line A', oee: 82 },
  { name: 'CNC Machine B', oee: 91 },
  { name: 'Paint Booth', oee: 72 },
  { name: 'Welding Station', oee: 88 },
  { name: 'Packaging Line', oee: 85 },
];

const downtimeData = [
  { name: 'Planned Maintenance', value: 28, color: '#3b82f6' },
  { name: 'Unplanned Breakdown', value: 22, color: '#ef4444' },
  { name: 'Changeover', value: 18, color: '#f59e0b' },
  { name: 'Material Shortage', value: 15, color: '#8b5cf6' },
  { name: 'Quality Issues', value: 10, color: '#ec4899' },
  { name: 'Other', value: 7, color: '#6b7280' },
];

const downtimeEvents = [
  { date: 'Feb 15', center: 'CNC Machine B', duration: '3.2 hrs', category: 'Unplanned Breakdown', cause: 'Spindle bearing failure' },
  { date: 'Feb 14', center: 'Paint Booth', duration: '2.5 hrs', category: 'Material Shortage', cause: 'Paint supply delay' },
  { date: 'Feb 13', center: 'Assembly Line A', duration: '2.0 hrs', category: 'Changeover', cause: 'Product line switch' },
  { date: 'Feb 12', center: 'Welding Station', duration: '1.8 hrs', category: 'Planned Maintenance', cause: 'Electrode replacement' },
  { date: 'Feb 11', center: 'Packaging Line', duration: '1.5 hrs', category: 'Quality Issues', cause: 'Label misalignment' },
];

const cycleTimeData = [
  { name: 'Assembly A', target: 45, actual: 48 },
  { name: 'CNC B', target: 30, actual: 29 },
  { name: 'Paint', target: 60, actual: 68 },
  { name: 'Welding', target: 25, actual: 26 },
  { name: 'Packaging', target: 15, actual: 16 },
];

const rejectTrend = Array.from({ length: 14 }, (_, i) => ({
  date: `Feb ${i + 1}`,
  rate: 2.5 + Math.random() * 2.5,
}));

const firstPassYield = [
  { center: 'Assembly Line A', yield: 96.2, target: 97.0 },
  { center: 'CNC Machine B', yield: 98.5, target: 98.0 },
  { center: 'Paint Booth', yield: 93.8, target: 95.0 },
  { center: 'Welding Station', yield: 97.1, target: 96.5 },
  { center: 'Packaging Line', yield: 99.1, target: 98.5 },
];

const shiftData = [
  { shift: 'Morning', oee: 82.3, units: 1240, defect: 2.1, downtime: 1.2, color: 'amber' },
  { shift: 'Afternoon', oee: 76.8, units: 1105, defect: 3.4, downtime: 2.1, color: 'blue' },
  { shift: 'Night', oee: 71.2, units: 980, defect: 4.2, downtime: 3.0, color: 'indigo' },
];

function CircularGauge({ value, size = 120, strokeWidth = 10, color }: { value: number; size?: number; strokeWidth?: number; color: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
    </svg>
  );
}

function MetricCard({ title, value, trend, trendValue, color, colorHex, icon: Icon }: {
  title: string; value: number; trend: 'up' | 'down'; trendValue: string; color: string; colorHex: string; icon: React.ElementType;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
        <Icon className="w-4 h-4" />
        <span>{title}</span>
      </div>
      <div className="relative flex items-center justify-center">
        <CircularGauge value={value} color={colorHex} />
        <span className={`absolute text-2xl font-bold text-${color}-600`}>{value}%</span>
      </div>
      <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
        {trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
        <span>{trendValue} vs last period</span>
      </div>
    </div>
  );
}

function getBarColor(value: number) {
  if (value >= 80) return '#22c55e';
  if (value >= 60) return '#eab308';
  return '#ef4444';
}

export default function OEEDashboard() {
  const [activeSection, setActiveSection] = useState<string>('all');

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Factory className="w-7 h-7 text-slate-700" />
          <h1 className="text-2xl font-bold text-slate-800">OEE Dashboard</h1>
        </div>
        <div className="flex gap-2">
          {['all', 'efficiency', 'downtime', 'shifts'].map(s => (
            <button key={s} onClick={() => setActiveSection(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${activeSection === s ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>
              {s === 'all' ? 'Overview' : s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Overall OEE" value={78.5} trend="up" trendValue="+2.3%" color="slate" colorHex="#475569" icon={Gauge} />
        <MetricCard title="Availability" value={89.2} trend="up" trendValue="+1.1%" color="emerald" colorHex="#22c55e" icon={Activity} />
        <MetricCard title="Performance" value={91.3} trend="down" trendValue="-0.8%" color="blue" colorHex="#3b82f6" icon={TrendingUp} />
        <MetricCard title="Quality" value={96.5} trend="up" trendValue="+0.5%" color="teal" colorHex="#14b8a6" icon={CheckCircle} />
      </div>

      {(activeSection === 'all' || activeSection === 'efficiency') && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" /> OEE Trend (Last 30 Days)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={oeeTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} stroke="#94a3b8" />
                <YAxis domain={[60, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0' }} />
                <Area type="monotone" dataKey="availability" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} name="Availability" />
                <Area type="monotone" dataKey="performance" stackId="2" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Performance" />
                <Area type="monotone" dataKey="quality" stackId="3" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.3} name="Quality" />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" /> Work Center OEE Comparison
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={workCenterData} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={120} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0' }} />
                <Bar dataKey="oee" radius={[0, 6, 6, 0]} name="OEE %">
                  {workCenterData.map((entry, idx) => (
                    <Cell key={idx} fill={getBarColor(entry.oee)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {(activeSection === 'all' || activeSection === 'downtime') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" /> Downtime by Category
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={downtimeData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={3} label={({ name, value }) => `${value}%`}>
                  {downtimeData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0' }} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Top 5 Downtime Events
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Work Center</th>
                    <th className="pb-2 font-medium">Duration</th>
                    <th className="pb-2 font-medium">Category</th>
                    <th className="pb-2 font-medium">Root Cause</th>
                  </tr>
                </thead>
                <tbody>
                  {downtimeEvents.map((evt, i) => (
                    <tr key={i} className="border-b border-slate-100 text-slate-700">
                      <td className="py-2">{evt.date}</td>
                      <td className="py-2">{evt.center}</td>
                      <td className="py-2 font-medium text-red-600">{evt.duration}</td>
                      <td className="py-2"><span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">{evt.category}</span></td>
                      <td className="py-2 text-slate-500">{evt.cause}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {(activeSection === 'all' || activeSection === 'efficiency') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">Cycle Time: Target vs Actual</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={cycleTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0' }} />
                <Bar dataKey="target" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Target (sec)" />
                <Bar dataKey="actual" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Actual (sec)" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">Reject Rate Trend</h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={rejectTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={2} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" unit="%" />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0' }} />
                <Line type="monotone" dataKey="rate" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Reject Rate %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {(activeSection === 'all' || activeSection === 'efficiency') && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">First Pass Yield</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-2 font-medium">Work Center</th>
                <th className="pb-2 font-medium">Yield %</th>
                <th className="pb-2 font-medium">Target %</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Progress</th>
              </tr>
            </thead>
            <tbody>
              {firstPassYield.map((row, i) => (
                <tr key={i} className="border-b border-slate-100 text-slate-700">
                  <td className="py-2.5 font-medium">{row.center}</td>
                  <td className="py-2.5">{row.yield}%</td>
                  <td className="py-2.5">{row.target}%</td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.yield >= row.target ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {row.yield >= row.target ? 'On Target' : 'Below Target'}
                    </span>
                  </td>
                  <td className="py-2.5 w-40">
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${row.yield >= row.target ? 'bg-emerald-500' : 'bg-red-400'}`}
                        style={{ width: `${Math.min(row.yield, 100)}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(activeSection === 'all' || activeSection === 'shifts') && (
        <div>
          <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" /> Shift Comparison
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {shiftData.map((s) => (
              <div key={s.shift} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-700">{s.shift} Shift</h3>
                  <span className={`text-2xl font-bold ${s.oee >= 80 ? 'text-emerald-600' : s.oee >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                    {s.oee}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 mb-4">
                  <div className={`h-3 rounded-full transition-all ${s.oee >= 80 ? 'bg-emerald-500' : s.oee >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${s.oee}%` }} />
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Units Produced</span>
                    <span className="font-semibold text-slate-700">{s.units.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Defect Rate</span>
                    <span className={`font-semibold ${s.defect <= 2.5 ? 'text-emerald-600' : s.defect <= 3.5 ? 'text-amber-600' : 'text-red-600'}`}>{s.defect}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Downtime</span>
                    <span className={`font-semibold ${s.downtime <= 1.5 ? 'text-emerald-600' : s.downtime <= 2.5 ? 'text-amber-600' : 'text-red-600'}`}>{s.downtime} hrs</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
