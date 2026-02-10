import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, XCircle, Target, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ComposedChart, Area, Legend,
  ReferenceLine
} from 'recharts';

interface QualityMetrics {
  totalInspections: number;
  passRate: number;
  failRate: number;
  totalNCRs: number;
  openNCRs: number;
  averageResolutionDays: number;
  topDefectCategories: { category: string; count: number; cumulative: number }[];
  monthlyTrend: { month: string; pass: number; fail: number; rate: number }[];
  severityDistribution: { severity: string; count: number }[];
  spcData: { month: string; defectRate: number }[];
  dpmo: number;
  sigmaLevel: number;
  firstPassYield: number;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  major: '#f59e0b',
  minor: '#eab308',
  cosmetic: '#84cc16',
  observation: '#94a3b8',
};

export default function QualityAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<QualityMetrics>({
    totalInspections: 0, passRate: 0, failRate: 0, totalNCRs: 0, openNCRs: 0,
    averageResolutionDays: 0, topDefectCategories: [], monthlyTrend: [],
    severityDistribution: [], spcData: [], dpmo: 0, sigmaLevel: 0, firstPassYield: 0,
  });

  useEffect(() => { loadMetrics(); }, []);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const [inspRes, ncrRes, capaRes] = await Promise.all([
        supabase.from('quality_inspections').select('id, result, inspected_at, created_at, quantity_failed, quantity_inspected'),
        supabase.from('ncr_reports').select('id, status, severity, category, created_at, containment_date'),
        supabase.from('capa_reports').select('id, status, severity, source'),
      ]);

      const inspections = inspRes.data || [];
      const ncrs = ncrRes.data || [];
      const capas = capaRes.data || [];

      const totalInspections = inspections.length;
      const passedInspections = inspections.filter(i => i.result === 'pass').length;
      const failedInspections = inspections.filter(i => i.result === 'fail').length;
      const passRate = totalInspections > 0 ? (passedInspections / totalInspections) * 100 : 0;
      const failRate = totalInspections > 0 ? (failedInspections / totalInspections) * 100 : 0;

      const totalNCRs = ncrs.length;
      const openNCRs = ncrs.filter(n => !['closed', 'verified'].includes(n.status)).length;

      const resolvedNCRs = ncrs.filter(n => n.status === 'closed' && n.containment_date);
      const avgResolution = resolvedNCRs.length > 0
        ? resolvedNCRs.reduce((sum, ncr) => {
            const created = new Date(ncr.created_at).getTime();
            const resolved = new Date(ncr.containment_date!).getTime();
            return sum + (resolved - created) / (1000 * 60 * 60 * 24);
          }, 0) / resolvedNCRs.length
        : 0;

      const totalDefects = inspections.reduce((s, i) => s + (i.quantity_failed || 0), 0);
      const totalInspected = inspections.reduce((s, i) => s + (i.quantity_inspected || 1), 0);
      const dpmo = totalInspected > 0 ? (totalDefects / totalInspected) * 1000000 : 0;

      const sigmaMap: [number, number][] = [[6210, 4], [66807, 3], [308538, 2], [690000, 1]];
      let sigmaLevel = dpmo === 0 ? 6 : 1;
      for (const [threshold, sigma] of sigmaMap) {
        if (dpmo <= threshold) { sigmaLevel = sigma; break; }
      }
      if (dpmo <= 3.4) sigmaLevel = 6;
      else if (dpmo <= 233) sigmaLevel = 5;

      const firstPassYield = totalInspections > 0 ? (passedInspections / totalInspections) * 100 : 100;

      const categoryMap = new Map<string, number>();
      ncrs.forEach(n => {
        const cat = n.category || 'uncategorized';
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
      });
      const sorted = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1]);
      const totalDefectCount = sorted.reduce((s, [, c]) => s + c, 0);
      let running = 0;
      const topDefectCategories = sorted.map(([category, count]) => {
        running += count;
        return { category: category.replace(/_/g, ' '), count, cumulative: totalDefectCount > 0 ? Math.round((running / totalDefectCount) * 100) : 0 };
      });

      const severityMap = new Map<string, number>();
      ncrs.forEach(ncr => severityMap.set(ncr.severity, (severityMap.get(ncr.severity) || 0) + 1));
      const severityDistribution = Array.from(severityMap.entries()).map(([severity, count]) => ({ severity, count }));

      const monthlyMap = new Map<string, { pass: number; fail: number }>();
      inspections.forEach(insp => {
        const d = new Date(insp.inspected_at || insp.created_at);
        const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const current = monthlyMap.get(month) || { pass: 0, fail: 0 };
        if (insp.result === 'pass') current.pass++;
        else if (insp.result === 'fail') current.fail++;
        monthlyMap.set(month, current);
      });
      const monthlyTrend = Array.from(monthlyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-8)
        .map(([month, data]) => {
          const total = data.pass + data.fail;
          const shortMonth = new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          return { month: shortMonth, ...data, rate: total > 0 ? Math.round((data.pass / total) * 100) : 0 };
        });

      const spcData = monthlyTrend.map(m => ({
        month: m.month,
        defectRate: 100 - m.rate,
      }));

      setMetrics({
        totalInspections, passRate: Math.round(passRate * 10) / 10, failRate: Math.round(failRate * 10) / 10,
        totalNCRs, openNCRs, averageResolutionDays: Math.round(avgResolution),
        topDefectCategories, monthlyTrend, severityDistribution, spcData,
        dpmo: Math.round(dpmo), sigmaLevel, firstPassYield: Math.round(firstPassYield * 10) / 10,
      });
    } catch (err) {
      console.error('Failed to load quality metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map(i => <div key={i} className="h-80 bg-white rounded-xl border border-slate-200 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const avgDefectRate = metrics.spcData.length > 0
    ? metrics.spcData.reduce((s, d) => s + d.defectRate, 0) / metrics.spcData.length
    : 0;
  const stdDev = metrics.spcData.length > 1
    ? Math.sqrt(metrics.spcData.reduce((s, d) => s + Math.pow(d.defectRate - avgDefectRate, 2), 0) / (metrics.spcData.length - 1))
    : 0;
  const ucl = avgDefectRate + 3 * stdDev;
  const lcl = Math.max(0, avgDefectRate - 3 * stdDev);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Inspections" value={metrics.totalInspections} icon={BarChart3} color="blue" />
        <MetricCard label="First Pass Yield" value={`${metrics.firstPassYield}%`} icon={CheckCircle2} color="emerald"
          trend={metrics.firstPassYield > 90 ? 'up' : metrics.firstPassYield < 80 ? 'down' : undefined} />
        <MetricCard label="Open NCRs" value={metrics.openNCRs} icon={AlertTriangle}
          color={metrics.openNCRs > 5 ? 'red' : 'amber'} />
        <MetricCard label="Avg Resolution" value={`${metrics.averageResolutionDays}d`} icon={TrendingUp} color="cyan" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-slate-500">DPMO</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.dpmo.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400">Defects Per Million Opportunities</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-medium text-slate-500">Sigma Level</span>
          </div>
          <p className={`text-2xl font-bold ${metrics.sigmaLevel >= 4 ? 'text-emerald-600' : metrics.sigmaLevel >= 3 ? 'text-amber-600' : 'text-red-600'}`}>
            {metrics.sigmaLevel}σ
          </p>
          <p className="text-[10px] text-slate-400">Process Capability</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-600" />
            <span className="text-xs font-medium text-slate-500">Fail Rate</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.failRate}%</p>
          <p className="text-[10px] text-slate-400">Overall Rejection Rate</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-medium text-slate-500">Total NCRs</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics.totalNCRs}</p>
          <p className="text-[10px] text-slate-400">{metrics.openNCRs} open</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Inspection Trend & Pass Rate</h3>
          <p className="text-[10px] text-slate-400 mb-4">Monthly pass/fail counts with overlaid pass rate %</p>
          {metrics.monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={metrics.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="pass" fill="#10b981" name="Pass" radius={[2, 2, 0, 0]} />
                <Bar yAxisId="left" dataKey="fail" fill="#ef4444" name="Fail" radius={[2, 2, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} name="Pass Rate %" dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No data available</div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">SPC - Defect Rate Control Chart</h3>
          <p className="text-[10px] text-slate-400 mb-4">Statistical Process Control with UCL/LCL boundaries</p>
          {metrics.spcData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={metrics.spcData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis domain={[0, 'auto']} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                <ReferenceLine y={avgDefectRate} stroke="#3b82f6" strokeDasharray="5 5" label={{ value: `CL: ${avgDefectRate.toFixed(1)}%`, fontSize: 10, fill: '#3b82f6' }} />
                <ReferenceLine y={ucl} stroke="#ef4444" strokeDasharray="3 3" label={{ value: `UCL: ${ucl.toFixed(1)}%`, fontSize: 10, fill: '#ef4444' }} />
                {lcl > 0 && <ReferenceLine y={lcl} stroke="#10b981" strokeDasharray="3 3" label={{ value: `LCL: ${lcl.toFixed(1)}%`, fontSize: 10, fill: '#10b981' }} />}
                <Line type="monotone" dataKey="defectRate" stroke="#f59e0b" strokeWidth={2} name="Defect Rate" dot={{ r: 4, fill: '#f59e0b' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Not enough data for SPC</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Defect Pareto Analysis</h3>
          <p className="text-[10px] text-slate-400 mb-4">NCR categories sorted by frequency with cumulative %</p>
          {metrics.topDefectCategories.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={metrics.topDefectCategories}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 10 }} stroke="#94a3b8" angle={-20} textAnchor="end" height={50} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip />
                <Bar yAxisId="left" dataKey="count" fill="#f59e0b" name="Count" radius={[3, 3, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#ef4444" strokeWidth={2} name="Cumulative %" dot={{ r: 3 }} />
                <ReferenceLine yAxisId="right" y={80} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '80%', fontSize: 10, fill: '#ef4444' }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No NCR category data</div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">NCR Severity Distribution</h3>
          {metrics.severityDistribution.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="55%" height={250}>
                <PieChart>
                  <Pie data={metrics.severityDistribution} cx="50%" cy="50%" labelLine={false} outerRadius={85} innerRadius={50} fill="#8884d8" dataKey="count" paddingAngle={2}>
                    {metrics.severityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.severity] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {metrics.severityDistribution.map(s => {
                  const total = metrics.severityDistribution.reduce((sum, d) => sum + d.count, 0);
                  const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                  return (
                    <div key={s.severity} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[s.severity] || '#94a3b8' }} />
                      <span className="text-xs text-slate-700 capitalize flex-1">{s.severity}</span>
                      <span className="text-xs font-medium text-slate-900">{s.count}</span>
                      <span className="text-[10px] text-slate-400">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No NCR data available</div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color, trend }: { label: string; value: string | number; icon: any; color: string; trend?: 'up' | 'down' }) {
  const colorMap: Record<string, { bg: string; text: string; val: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', val: 'text-blue-900' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', val: 'text-emerald-900' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', val: 'text-amber-900' },
    red: { bg: 'bg-red-50', text: 'text-red-600', val: 'text-red-900' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', val: 'text-cyan-900' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${c.bg}`}>
            <Icon className={`w-4 h-4 ${c.text}`} />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">{label}</p>
            <p className={`text-xl font-bold ${c.val}`}>{value}</p>
          </div>
        </div>
        {trend && (
          <div className={`p-1.5 rounded-lg ${trend === 'up' ? 'bg-emerald-50' : 'bg-red-50'}`}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
          </div>
        )}
      </div>
    </div>
  );
}
