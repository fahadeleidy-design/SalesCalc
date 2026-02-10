import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface QualityMetrics {
  totalInspections: number;
  passRate: number;
  failRate: number;
  totalNCRs: number;
  openNCRs: number;
  averageResolutionDays: number;
  topDefectCategories: { category: string; count: number }[];
  monthlyTrend: { month: string; pass: number; fail: number }[];
  severityDistribution: { severity: string; count: number }[];
}

export default function QualityAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<QualityMetrics>({
    totalInspections: 0,
    passRate: 0,
    failRate: 0,
    totalNCRs: 0,
    openNCRs: 0,
    averageResolutionDays: 0,
    topDefectCategories: [],
    monthlyTrend: [],
    severityDistribution: [],
  });

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const { data: inspections } = await supabase
        .from('quality_inspections')
        .select('id, result, inspection_date, created_at');

      const { data: ncrs } = await supabase
        .from('ncr_reports')
        .select('id, status, severity, created_at, containment_date');

      const totalInspections = inspections?.length || 0;
      const passedInspections = inspections?.filter(i => i.result === 'pass').length || 0;
      const failedInspections = inspections?.filter(i => i.result === 'fail').length || 0;
      const passRate = totalInspections > 0 ? (passedInspections / totalInspections) * 100 : 0;
      const failRate = totalInspections > 0 ? (failedInspections / totalInspections) * 100 : 0;

      const totalNCRs = ncrs?.length || 0;
      const openNCRs = ncrs?.filter(n => !['closed', 'verified'].includes(n.status)).length || 0;

      const resolvedNCRs = ncrs?.filter(n => n.status === 'closed' && n.containment_date) || [];
      const avgResolution = resolvedNCRs.length > 0
        ? resolvedNCRs.reduce((sum, ncr) => {
            const created = new Date(ncr.created_at).getTime();
            const resolved = new Date(ncr.containment_date!).getTime();
            return sum + (resolved - created) / (1000 * 60 * 60 * 24);
          }, 0) / resolvedNCRs.length
        : 0;

      const severityMap = new Map<string, number>();
      ncrs?.forEach(ncr => {
        severityMap.set(ncr.severity, (severityMap.get(ncr.severity) || 0) + 1);
      });
      const severityDistribution = Array.from(severityMap.entries()).map(([severity, count]) => ({
        severity,
        count,
      }));

      const monthlyMap = new Map<string, { pass: number; fail: number }>();
      inspections?.forEach(insp => {
        const month = new Date(insp.inspection_date || insp.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const current = monthlyMap.get(month) || { pass: 0, fail: 0 };
        if (insp.result === 'pass') current.pass++;
        else if (insp.result === 'fail') current.fail++;
        monthlyMap.set(month, current);
      });
      const monthlyTrend = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({ month, ...data }))
        .slice(-6);

      setMetrics({
        totalInspections,
        passRate: Math.round(passRate),
        failRate: Math.round(failRate),
        totalNCRs,
        openNCRs,
        averageResolutionDays: Math.round(avgResolution),
        topDefectCategories: [],
        monthlyTrend,
        severityDistribution,
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

  const SEVERITY_COLORS: Record<string, string> = {
    critical: '#ef4444',
    major: '#f59e0b',
    minor: '#eab308',
    cosmetic: '#84cc16',
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Inspections"
          value={metrics.totalInspections}
          icon={BarChart3}
          color="blue"
        />
        <MetricCard
          label="Pass Rate"
          value={`${metrics.passRate}%`}
          icon={CheckCircle2}
          color="emerald"
          trend={metrics.passRate > 90 ? 'up' : metrics.passRate < 80 ? 'down' : undefined}
        />
        <MetricCard
          label="Open NCRs"
          value={metrics.openNCRs}
          icon={AlertTriangle}
          color={metrics.openNCRs > 5 ? 'red' : 'amber'}
        />
        <MetricCard
          label="Avg Resolution"
          value={`${metrics.averageResolutionDays}d`}
          icon={TrendingUp}
          color="cyan"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Inspection Trend (Last 6 Months)</h3>
          {metrics.monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={metrics.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip />
                <Line type="monotone" dataKey="pass" stroke="#10b981" strokeWidth={2} name="Pass" />
                <Line type="monotone" dataKey="fail" stroke="#ef4444" strokeWidth={2} name="Fail" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No data available</div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">NCR Severity Distribution</h3>
          {metrics.severityDistribution.length > 0 ? (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={metrics.severityDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={entry => `${entry.severity} (${entry.count})`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {metrics.severityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.severity] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No NCR data available</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard label="Total Inspections" value={metrics.totalInspections} color="slate" />
        <StatCard label="Total NCRs" value={metrics.totalNCRs} color="amber" />
        <StatCard label="Fail Rate" value={`${metrics.failRate}%`} color={metrics.failRate > 20 ? 'red' : 'slate'} />
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
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colorMap: Record<string, string> = {
    slate: 'bg-slate-50 border-slate-200 text-slate-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    red: 'bg-red-50 border-red-200 text-red-900',
  };
  const c = colorMap[color] || colorMap.slate;

  return (
    <div className={`rounded-xl border p-4 ${c}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
