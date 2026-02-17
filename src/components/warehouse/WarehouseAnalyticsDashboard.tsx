import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3, TrendingUp, Package, Warehouse, Clock, Users,
  Target, AlertTriangle, Layers, Activity, Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format, subDays } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

const TABS = ['Inventory Health', 'Throughput', 'Space Utilization', 'Picker Performance', 'Accuracy & Quality'] as const;
type Tab = typeof TABS[number];
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
const AGING_COLORS: Record<string, string> = { '0-30': '#10b981', '31-60': '#3b82f6', '61-90': '#f59e0b', '91-180': '#f97316', '180+': '#ef4444' };
const Empty = ({ msg = 'No data available' }: { msg?: string }) => <div className="h-64 flex items-center justify-center text-slate-400 text-sm">{msg}</div>;

function BigNumber({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: any; color: string }) {
  const m: Record<string, [string, string, string]> = {
    blue: ['bg-blue-50', 'text-blue-600', 'text-blue-900'], emerald: ['bg-emerald-50', 'text-emerald-600', 'text-emerald-900'],
    amber: ['bg-amber-50', 'text-amber-600', 'text-amber-900'], red: ['bg-red-50', 'text-red-600', 'text-red-900'],
    purple: ['bg-purple-50', 'text-purple-600', 'text-purple-900'], cyan: ['bg-cyan-50', 'text-cyan-600', 'text-cyan-900'],
  };
  const [bg, txt, val] = m[color] || m.blue;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bg}`}><Icon className={`w-4 h-4 ${txt}`} /></div>
        <div>
          <p className="text-[11px] text-slate-500 font-medium">{label}</p>
          <p className={`text-xl font-bold ${val}`}>{value}</p>
          {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-sm font-semibold text-slate-900 mb-1">{title}</h3>
      {subtitle && <p className="text-[10px] text-slate-400 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}

function DonutWithLegend({ data, dataKey, colorFn, labelFn, valueFn }: { data: any[]; dataKey: string; colorFn: (d: any, i: number) => string; labelFn: (d: any) => string; valueFn: (d: any) => string }) {
  const total = data.reduce((s, d) => s + (Number(d[dataKey]) || 0), 0);
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="55%" height={280}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={90} innerRadius={55} dataKey={dataKey} paddingAngle={2}>
            {data.map((d, i) => <Cell key={i} fill={colorFn(d, i)} />)}
          </Pie>
          <Tooltip formatter={(v: number) => valueFn({ [dataKey]: v })} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorFn(d, i) }} />
            <span className="text-xs text-slate-600 flex-1 capitalize">{labelFn(d)}</span>
            <span className="text-xs font-semibold text-slate-900">{valueFn(d)}</span>
            <span className="text-[10px] text-slate-400">{total > 0 ? Math.round((Number(d[dataKey]) / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const ax = { x: { tick: { fontSize: 10 }, stroke: '#94a3b8' }, y: { tick: { fontSize: 11 }, stroke: '#94a3b8' } };
const grid = <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />;

export default function WarehouseAnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('Inventory Health');
  const [loading, setLoading] = useState(true);
  const [ih, setIH] = useState<any>(null);
  const [tp, setTP] = useState<any>(null);
  const [su, setSU] = useState<any>(null);
  const [pp, setPP] = useState<any>(null);
  const [ac, setAC] = useState<any>(null);

  const loadIH = useCallback(async () => {
    const { data } = await supabase.from('inventory_valuations').select('*, products(name, sku, category)');
    const rows = data || [];
    const bk: Record<string, { count: number; value: number }> = { '0-30': { count: 0, value: 0 }, '31-60': { count: 0, value: 0 }, '61-90': { count: 0, value: 0 }, '91-180': { count: 0, value: 0 }, '180+': { count: 0, value: 0 } };
    let dsv = 0, sc = 0, sv = 0, td = 0, tt = 0, vc = 0;
    rows.forEach((r: any) => {
      const d = r.days_on_hand || 0, v = Number(r.total_value) || 0;
      const key = d <= 30 ? '0-30' : d <= 60 ? '31-60' : d <= 90 ? '61-90' : d <= 180 ? '91-180' : '180+';
      bk[key].count++; bk[key].value += v;
      if (r.is_dead_stock) dsv += v;
      if (r.is_slow_moving) { sc++; sv += v; }
      td += d;
      if (r.turnover_rate != null) { tt += Number(r.turnover_rate); vc++; }
    });
    setIH({
      agingData: Object.entries(bk).map(([bucket, d]) => ({ bucket, count: d.count, value: Math.round(d.value) })),
      deadStockValue: dsv, slowCount: sc, slowValue: sv,
      avgCoverageDays: rows.length > 0 ? Math.round(td / rows.length) : 0,
      avgTurnover: vc > 0 ? (tt / vc).toFixed(1) : '0', totalItems: rows.length,
    });
  }, []);

  const loadTP = useCallback(async () => {
    const { data } = await supabase.from('stock_movements')
      .select('id, movement_type, quantity, performed_at, products(name, sku), profiles!stock_movements_performed_by_fkey(full_name)')
      .gte('performed_at', format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const rows = data || [];
    const dm = new Map<string, { inbound: number; outbound: number }>();
    const tm = new Map<string, number>(), hm = new Map<number, number>();
    let ti = 0, to = 0;
    rows.forEach((m: any) => {
      const date = format(new Date(m.performed_at), 'MMM dd'), hour = new Date(m.performed_at).getHours();
      const qty = Math.abs(Number(m.quantity) || 0);
      const d = dm.get(date) || { inbound: 0, outbound: 0 };
      if (['inbound', 'purchase', 'return_in'].includes(m.movement_type)) { d.inbound += qty; ti += qty; } else { d.outbound += qty; to += qty; }
      dm.set(date, d); tm.set(m.movement_type, (tm.get(m.movement_type) || 0) + 1); hm.set(hour, (hm.get(hour) || 0) + 1);
    });
    const days = dm.size || 1;
    setTP({
      dailyData: Array.from(dm.entries()).map(([date, d]) => ({ date, ...d })),
      typeData: Array.from(tm.entries()).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value })),
      hourData: Array.from({ length: 24 }, (_, h) => ({ hour: `${h.toString().padStart(2, '0')}:00`, count: hm.get(h) || 0 })),
      avgInbound: Math.round(ti / days), avgOutbound: Math.round(to / days), totalMovements: rows.length,
    });
  }, []);

  const loadSU = useCallback(async () => {
    const [{ data: zones }, { data: locs }] = await Promise.all([supabase.from('warehouse_zones').select('*'), supabase.from('warehouse_locations').select('*')]);
    const zr = zones || [], lr = locs || [];
    const tm = new Map<string, number>();
    let tc = 0, tocc = 0;
    lr.forEach((l: any) => { tm.set(l.location_type || 'standard', (tm.get(l.location_type || 'standard') || 0) + 1); tc += Number(l.max_capacity) || 0; tocc += Number(l.current_stock) || 0; });
    setSU({
      zoneData: zr.map((z: any) => ({ name: z.zone_name, capacity: z.max_capacity || 0, occupied: z.current_occupancy || 0, utilization: z.max_capacity > 0 ? Math.round((z.current_occupancy / z.max_capacity) * 100) : 0 })),
      typeData: Array.from(tm.entries()).map(([name, value]) => ({ name, value })),
      totalCapacity: tc, totalOccupied: tocc, totalAvailable: tc - tocc, totalLocations: lr.length,
    });
  }, []);

  const loadPP = useCallback(async () => {
    const { data } = await supabase.from('pick_lists').select('id, status, assigned_to_id, created_at, completed_at, profiles!pick_lists_assigned_to_fkey(full_name)');
    const rows = data || [];
    const pm = new Map<string, { name: string; total: number; completed: number; days: Set<string> }>();
    const sm = new Map<string, number>();
    rows.forEach((p: any) => {
      const name = p.profiles?.full_name || 'Unassigned', key = p.assigned_to_id || 'unassigned';
      const e = pm.get(key) || { name, total: 0, completed: 0, days: new Set<string>() };
      e.total++; if (['picked', 'packing', 'ready_to_ship'].includes(p.status)) e.completed++;
      if (p.created_at) e.days.add(format(new Date(p.created_at), 'yyyy-MM-dd'));
      pm.set(key, e); sm.set(p.status, (sm.get(p.status) || 0) + 1);
    });
    setPP({
      leaderboard: Array.from(pm.values()).filter(p => p.name !== 'Unassigned')
        .map(p => ({ name: p.name, total: p.total, completed: p.completed, rate: p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0, avgPerDay: p.days.size > 0 ? (p.total / p.days.size).toFixed(1) : '0' }))
        .sort((a, b) => b.completed - a.completed),
      statusData: Array.from(sm.entries()).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value })),
      totalPicks: rows.length,
    });
  }, []);

  const loadAC = useCallback(async () => {
    const [{ data: sess }, { data: lots }] = await Promise.all([
      supabase.from('cycle_count_sessions').select('*').order('scheduled_date', { ascending: true }),
      supabase.from('lot_tracking').select('id, expiry_date, status, products(name)'),
    ]);
    const sr = sess || [], lr = lots || [];
    const trend = sr.filter((s: any) => s.accuracy_percentage != null).map((s: any) => ({ date: format(new Date(s.scheduled_date), 'MMM dd'), accuracy: Number(s.accuracy_percentage), discrepancies: Number(s.total_discrepancies) || 0 }));
    const em = new Map<string, number>();
    lr.forEach((l: any) => { if (l.expiry_date && l.status === 'active') { const m = format(new Date(l.expiry_date), 'MMM yyyy'); em.set(m, (em.get(m) || 0) + 1); } });
    setAC({
      accuracyTrend: trend,
      avgAccuracy: trend.length > 0 ? (trend.reduce((s: number, a: any) => s + a.accuracy, 0) / trend.length).toFixed(1) : '0',
      totalDiscrepancies: sr.reduce((s: number, r: any) => s + (Number(r.total_discrepancies) || 0), 0),
      totalSessions: sr.length,
      expiryData: Array.from(em.entries()).map(([month, count]) => ({ month, count })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()).slice(0, 12),
    });
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await Promise.all([loadIH(), loadTP(), loadSU(), loadPP(), loadAC()]); setLoading(false); })();
  }, [loadIH, loadTP, loadSU, loadPP, loadAC]);

  if (loading) return (
    <div className="space-y-6">
      <div className="h-10 bg-white rounded-lg border border-slate-200 animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse" />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{[1, 2].map(i => <div key={i} className="h-80 bg-white rounded-xl border border-slate-200 animate-pulse" />)}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Warehouse Analytics</h1><p className="text-sm text-slate-500 mt-1">Deep insights into warehouse operations and performance</p></div>
        <div className="flex items-center gap-2 text-xs text-slate-400"><Clock className="w-3.5 h-3.5" />Last updated: {format(new Date(), 'MMM dd, HH:mm')}</div>
      </div>
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
        {TABS.map(tab => (<button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>{tab}</button>))}
      </div>
      {activeTab === 'Inventory Health' && ih && <InventoryHealthTab d={ih} />}
      {activeTab === 'Throughput' && tp && <ThroughputTab d={tp} />}
      {activeTab === 'Space Utilization' && su && <SpaceUtilTab d={su} />}
      {activeTab === 'Picker Performance' && pp && <PickerPerfTab d={pp} />}
      {activeTab === 'Accuracy & Quality' && ac && <AccuracyTab d={ac} />}
    </div>
  );
}

function InventoryHealthTab({ d }: { d: any }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <BigNumber label="Dead Stock Value" value={`$${d.deadStockValue.toLocaleString()}`} icon={AlertTriangle} color="red" sub="Requires attention" />
        <BigNumber label="Slow Moving Items" value={d.slowCount} icon={Package} color="amber" sub={`$${d.slowValue.toLocaleString()} total value`} />
        <BigNumber label="Avg Coverage Days" value={`${d.avgCoverageDays}d`} icon={Calendar} color="blue" sub="Average days on hand" />
        <BigNumber label="Avg Turnover Rate" value={`${d.avgTurnover}x`} icon={TrendingUp} color="emerald" sub={`Across ${d.totalItems} items`} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Inventory Aging Analysis" subtitle="Distribution of inventory by days on hand">
          {d.agingData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={d.agingData}>{grid}<XAxis dataKey="bucket" {...ax.x} /><YAxis {...ax.y} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="count" name="Items" radius={[3, 3, 0, 0]}>{d.agingData.map((e: any, i: number) => <Cell key={i} fill={AGING_COLORS[e.bucket] || COLORS[i]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>
        <Card title="Aging by Value" subtitle="Inventory value breakdown by age bucket">
          {d.agingData.length > 0 ? (
            <DonutWithLegend data={d.agingData.filter((x: any) => x.value > 0)} dataKey="value" colorFn={(e) => AGING_COLORS[e.bucket] || '#94a3b8'} labelFn={e => `${e.bucket} days`} valueFn={e => `$${(Number(e.value) || 0).toLocaleString()}`} />
          ) : <Empty />}
        </Card>
      </div>
    </>
  );
}

function ThroughputTab({ d }: { d: any }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <BigNumber label="Avg Daily Inbound" value={d.avgInbound} icon={Package} color="emerald" sub="Units per day" />
        <BigNumber label="Avg Daily Outbound" value={d.avgOutbound} icon={Package} color="blue" sub="Units per day" />
        <BigNumber label="Total Movements" value={d.totalMovements} icon={Activity} color="purple" sub="Last 30 days" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Daily Throughput (Last 30 Days)" subtitle="Inbound vs outbound volume trend">
          {d.dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={d.dailyData}>{grid}<XAxis dataKey="date" {...ax.x} interval="preserveStartEnd" /><YAxis {...ax.y} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="inbound" stroke="#10b981" fill="#10b981" fillOpacity={0.15} name="Inbound" />
                <Area type="monotone" dataKey="outbound" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} name="Outbound" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <Empty msg="No movement data" />}
        </Card>
        <Card title="Movement Type Breakdown" subtitle="Distribution of movement types">
          {d.typeData.length > 0 ? (
            <DonutWithLegend data={d.typeData} dataKey="value" colorFn={(_, i) => COLORS[i % COLORS.length]} labelFn={e => e.name} valueFn={e => String(e.value)} />
          ) : <Empty />}
        </Card>
      </div>
      <Card title="Peak Hours Analysis" subtitle="Movement frequency by hour of day">
        {d.hourData.some((h: any) => h.count > 0) ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={d.hourData}>{grid}<XAxis dataKey="hour" {...ax.x} interval={1} /><YAxis {...ax.y} /><Tooltip /><Bar dataKey="count" name="Movements" fill="#8b5cf6" radius={[3, 3, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        ) : <Empty msg="No hourly data" />}
      </Card>
    </>
  );
}

function SpaceUtilTab({ d }: { d: any }) {
  const ov = d.totalCapacity > 0 ? Math.round((d.totalOccupied / d.totalCapacity) * 100) : 0;
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <BigNumber label="Total Capacity" value={d.totalCapacity.toLocaleString()} icon={Warehouse} color="blue" />
        <BigNumber label="Occupied" value={d.totalOccupied.toLocaleString()} icon={Package} color="amber" />
        <BigNumber label="Available" value={d.totalAvailable.toLocaleString()} icon={Layers} color="emerald" />
        <BigNumber label="Overall Utilization" value={`${ov}%`} icon={BarChart3} color={ov > 85 ? 'red' : ov > 70 ? 'amber' : 'emerald'} sub={`${d.totalLocations} locations`} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Zone Utilization" subtitle="Capacity usage by warehouse zone">
          {d.zoneData.length > 0 ? (
            <div className="space-y-3">{d.zoneData.map((z: any) => (
              <div key={z.name}>
                <div className="flex items-center justify-between mb-1"><span className="text-sm font-medium text-slate-700">{z.name}</span><span className="text-sm font-semibold text-slate-900">{z.utilization}%</span></div>
                <div className="w-full bg-slate-100 rounded-full h-3"><div className={`h-3 rounded-full ${z.utilization > 90 ? 'bg-red-500' : z.utilization > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(z.utilization, 100)}%` }} /></div>
                <div className="flex justify-between mt-0.5"><span className="text-[10px] text-slate-400">{z.occupied} / {z.capacity} units</span><span className="text-[10px] text-slate-400">{z.capacity - z.occupied} available</span></div>
              </div>
            ))}</div>
          ) : <Empty msg="No zone data" />}
        </Card>
        <Card title="Location Type Distribution" subtitle="Breakdown of storage location types">
          {d.typeData.length > 0 ? (
            <DonutWithLegend data={d.typeData} dataKey="value" colorFn={(_, i) => COLORS[i % COLORS.length]} labelFn={e => e.name} valueFn={e => String(e.value)} />
          ) : <Empty />}
        </Card>
      </div>
      <Card title="Zone Capacity Overview" subtitle="Occupied vs total capacity per zone">
        {d.zoneData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={d.zoneData} layout="vertical">{grid}<XAxis type="number" {...ax.y} /><YAxis dataKey="name" type="category" width={100} {...ax.y} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="occupied" name="Occupied" fill="#f59e0b" radius={[0, 3, 3, 0]} /><Bar dataKey="capacity" name="Capacity" fill="#e2e8f0" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <Empty msg="No zone data" />}
      </Card>
    </>
  );
}

function PickerPerfTab({ d }: { d: any }) {
  const avgRate = d.leaderboard.length > 0 ? Math.round(d.leaderboard.reduce((s: number, p: any) => s + p.rate, 0) / d.leaderboard.length) : 0;
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <BigNumber label="Total Pick Lists" value={d.totalPicks} icon={Target} color="blue" />
        <BigNumber label="Active Pickers" value={d.leaderboard.length} icon={Users} color="purple" />
        <BigNumber label="Avg Completion Rate" value={`${avgRate}%`} icon={TrendingUp} color="emerald" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Picker Leaderboard" subtitle="Performance ranking by completed picks">
          {d.leaderboard.length > 0 ? (
            <div className="space-y-2">{d.leaderboard.map((p: any, i: number) => (
              <div key={p.name} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-900 truncate">{p.name}</p><p className="text-[10px] text-slate-400">{p.avgPerDay} picks/day avg</p></div>
                <div className="text-right"><p className="text-sm font-bold text-slate-900">{p.completed}<span className="text-xs text-slate-400 font-normal">/{p.total}</span></p><p className={`text-[10px] font-medium ${p.rate >= 80 ? 'text-emerald-600' : p.rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{p.rate}% complete</p></div>
              </div>
            ))}</div>
          ) : <Empty msg="No picker data" />}
        </Card>
        <Card title="Pick List Status Distribution" subtitle="Current status breakdown of all pick lists">
          {d.statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={d.statusData}>{grid}<XAxis dataKey="name" {...ax.x} /><YAxis {...ax.y} /><Tooltip />
                <Bar dataKey="value" name="Count" radius={[3, 3, 0, 0]}>{d.statusData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>
      </div>
    </>
  );
}

function AccuracyTab({ d }: { d: any }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <BigNumber label="Avg Accuracy" value={`${d.avgAccuracy}%`} icon={Target} color={Number(d.avgAccuracy) >= 95 ? 'emerald' : 'amber'} />
        <BigNumber label="Total Discrepancies" value={d.totalDiscrepancies} icon={AlertTriangle} color="red" />
        <BigNumber label="Count Sessions" value={d.totalSessions} icon={BarChart3} color="blue" />
        <BigNumber label="Expiring Lots" value={d.expiryData.reduce((s: number, x: any) => s + x.count, 0)} icon={Clock} color="amber" sub="Across tracked months" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Cycle Count Accuracy Trend" subtitle="Accuracy percentage over time">
          {d.accuracyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={d.accuracyTrend}>{grid}<XAxis dataKey="date" {...ax.x} /><YAxis domain={[0, 100]} {...ax.y} /><Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} /><Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} name="Accuracy %" dot={{ r: 3, fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <Empty msg="No accuracy data recorded" />}
        </Card>
        <Card title="Discrepancy Trend" subtitle="Discrepancies found per count session">
          {d.accuracyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={d.accuracyTrend}>{grid}<XAxis dataKey="date" {...ax.x} /><YAxis {...ax.y} /><Tooltip /><Bar dataKey="discrepancies" name="Discrepancies" fill="#ef4444" radius={[3, 3, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </Card>
      </div>
      <Card title="Lot Expiry Forecast" subtitle="Number of lots expiring per month">
        {d.expiryData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={d.expiryData}>{grid}<XAxis dataKey="month" {...ax.x} /><YAxis {...ax.y} /><Tooltip /><Bar dataKey="count" name="Expiring Lots" fill="#f59e0b" radius={[3, 3, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        ) : <Empty msg="No lots with expiry dates" />}
      </Card>
    </>
  );
}
