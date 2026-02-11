import { useState, useEffect, useCallback } from 'react';
import {
  ArrowUpDown, Search, X, Save, ArrowRight, RotateCcw, Download, Calendar, BarChart3, TrendingUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import toast from 'react-hot-toast';
import Pagination, { usePagination } from '../components/ui/Pagination';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from 'recharts';

const movementTypeConfig: Record<string, { label: string; color: string; bg: string; icon: string; chartColor: string }> = {
  goods_received: { label: 'Goods Received', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: '+', chartColor: '#059669' },
  production_consume: { label: 'Production Use', color: 'text-orange-700', bg: 'bg-orange-50', icon: '-', chartColor: '#ea580c' },
  production_output: { label: 'Production Output', color: 'text-blue-700', bg: 'bg-blue-50', icon: '+', chartColor: '#2563eb' },
  adjustment: { label: 'Adjustment', color: 'text-slate-700', bg: 'bg-slate-50', icon: '~', chartColor: '#475569' },
  transfer: { label: 'Transfer', color: 'text-teal-700', bg: 'bg-teal-50', icon: '>', chartColor: '#0d9488' },
  scrap: { label: 'Scrap', color: 'text-red-700', bg: 'bg-red-50', icon: '-', chartColor: '#dc2626' },
  return: { label: 'Return', color: 'text-amber-700', bg: 'bg-amber-50', icon: '+', chartColor: '#d97706' },
};

const reasonOptions = [
  { value: 'cycle_count', label: 'Cycle Count' },
  { value: 'damage', label: 'Damage' },
  { value: 'write_off', label: 'Write Off' },
  { value: 'correction', label: 'Correction' },
];

type ViewMode = 'table' | 'analytics';
type FormType = 'adjustment' | 'transfer' | null;

export default function StockMovementsPage() {
  const { profile } = useAuth();
  const [movements, setMovements] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [formType, setFormType] = useState<FormType>(null);
  const [adjustForm, setAdjustForm] = useState({ product_id: '', quantity: 0, reason: 'correction', notes: '' });
  const [transferForm, setTransferForm] = useState({ product_id: '', quantity: 0, from_location_id: '', to_location_id: '', notes: '' });
  const [stats, setStats] = useState({ totalToday: 0, received: 0, consumed: 0, adjustments: 0 });
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  const loadData = useCallback(async () => {
    try {
      const [movRes, prodRes, locRes] = await Promise.all([
        supabase.from('stock_movements')
          .select('*, product:products(name, sku), performed_by_profile:profiles!stock_movements_performed_by_fkey(full_name), from_location:warehouse_locations!stock_movements_from_location_id_fkey(location_code, location_name), to_location:warehouse_locations!stock_movements_to_location_id_fkey(location_code, location_name)')
          .order('performed_at', { ascending: false })
          .limit(500),
        supabase.from('products').select('id, name, sku').eq('is_active', true).order('name'),
        supabase.from('warehouse_locations').select('id, location_code, location_name').eq('is_active', true).order('location_code'),
      ]);

      const movs = movRes.data || [];
      setMovements(movs);
      setProducts(prodRes.data || []);
      setLocations(locRes.data || []);

      const today = new Date().toISOString().split('T')[0];
      const todayMovs = movs.filter((m: any) => m.performed_at?.startsWith(today));
      setStats({
        totalToday: todayMovs.length,
        received: todayMovs.filter((m: any) => m.movement_type === 'goods_received').length,
        consumed: todayMovs.filter((m: any) => m.movement_type === 'production_consume').length,
        adjustments: todayMovs.filter((m: any) => m.movement_type === 'adjustment').length,
      });
    } catch (err) {
      console.error('Failed to load stock movements:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const generateMovementNumber = async () => {
    const { count } = await supabase.from('stock_movements').select('*', { count: 'exact', head: true });
    return `SM-${String((count || 0) + 1).padStart(5, '0')}`;
  };

  const handleAdjustment = async () => {
    if (!adjustForm.product_id || adjustForm.quantity === 0) {
      toast.error('Select a product and enter a quantity');
      return;
    }
    try {
      const movementNumber = await generateMovementNumber();
      const { error } = await supabase.from('stock_movements').insert({
        movement_number: movementNumber,
        movement_type: 'adjustment',
        product_id: adjustForm.product_id,
        quantity: adjustForm.quantity,
        reference_type: 'manual',
        reason: adjustForm.reason,
        notes: adjustForm.notes || null,
        performed_by: profile?.id,
      } as any);
      if (error) throw error;
      toast.success('Stock adjustment recorded');
      setFormType(null);
      setAdjustForm({ product_id: '', quantity: 0, reason: 'correction', notes: '' });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record adjustment');
    }
  };

  const handleTransfer = async () => {
    if (!transferForm.product_id || transferForm.quantity <= 0 || !transferForm.from_location_id || !transferForm.to_location_id) {
      toast.error('Fill in all required fields');
      return;
    }
    if (transferForm.from_location_id === transferForm.to_location_id) {
      toast.error('Source and destination must be different');
      return;
    }
    try {
      const movementNumber = await generateMovementNumber();
      const { error } = await supabase.from('stock_movements').insert({
        movement_number: movementNumber,
        movement_type: 'transfer',
        product_id: transferForm.product_id,
        quantity: transferForm.quantity,
        from_location_id: transferForm.from_location_id,
        to_location_id: transferForm.to_location_id,
        reference_type: 'manual',
        notes: transferForm.notes || null,
        performed_by: profile?.id,
      } as any);
      if (error) throw error;
      toast.success('Stock transfer recorded');
      setFormType(null);
      setTransferForm({ product_id: '', quantity: 0, from_location_id: '', to_location_id: '', notes: '' });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record transfer');
    }
  };

  const filteredMovements = movements.filter(m => {
    const matchSearch = !searchTerm || m.movement_number?.toLowerCase().includes(searchTerm.toLowerCase()) || m.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || m.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = typeFilter === 'all' || m.movement_type === typeFilter;
    if (dateFrom && m.performed_at < dateFrom) return false;
    if (dateTo && m.performed_at > dateTo + 'T23:59:59') return false;
    return matchSearch && matchType;
  });

  const { totalItems, totalPages, pageSize, getPageItems } = usePagination(filteredMovements, 30);
  const pageItems = getPageItems(currentPage);

  const typeDistribution = Object.entries(movementTypeConfig).map(([key, conf]) => ({
    name: conf.label,
    value: movements.filter(m => m.movement_type === key).length,
    fill: conf.chartColor,
  })).filter(d => d.value > 0);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayMovs = movements.filter(m => m.performed_at?.startsWith(dateStr));
    return {
      date: format(date, 'MMM d'),
      total: dayMovs.length,
      inbound: dayMovs.filter(m => ['goods_received', 'production_output', 'return'].includes(m.movement_type)).length,
      outbound: dayMovs.filter(m => ['production_consume', 'scrap'].includes(m.movement_type)).length,
    };
  });

  const topProducts = (() => {
    const productCounts: Record<string, { name: string; count: number; qty: number }> = {};
    movements.forEach(m => {
      const name = m.product?.name || 'Unknown';
      if (!productCounts[name]) productCounts[name] = { name, count: 0, qty: 0 };
      productCounts[name].count++;
      productCounts[name].qty += Math.abs(Number(m.quantity) || 0);
    });
    return Object.values(productCounts).sort((a, b) => b.count - a.count).slice(0, 10);
  })();

  const exportCSV = () => {
    const rows = [['Movement #', 'Type', 'Product', 'SKU', 'Qty', 'From', 'To', 'Reference', 'Reason', 'By', 'Date']];
    filteredMovements.forEach((m: any) => {
      const conf = movementTypeConfig[m.movement_type] || { label: m.movement_type };
      rows.push([
        m.movement_number, conf.label, m.product?.name || '', m.product?.sku || '',
        String(m.quantity), m.from_location?.location_code || '', m.to_location?.location_code || '',
        m.reference_number || '', m.reason || '', m.performed_by_profile?.full_name || '',
        m.performed_at ? format(new Date(m.performed_at), 'yyyy-MM-dd HH:mm') : '',
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `stock_movements_${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}
        </div>
        <div className="h-96 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock Movements</h1>
          <p className="text-sm text-slate-500 mt-1">Track all inventory transactions and adjustments</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'analytics' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <BarChart3 className="w-3.5 h-3.5 inline mr-1" />Analytics
            </button>
          </div>
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={() => { setFormType('adjustment'); setAdjustForm({ product_id: '', quantity: 0, reason: 'correction', notes: '' }); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Adjust Stock
          </button>
          <button
            onClick={() => { setFormType('transfer'); setTransferForm({ product_id: '', quantity: 0, from_location_id: '', to_location_id: '', notes: '' }); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <ArrowUpDown className="w-4 h-4" /> Transfer Stock
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat label="Today's Movements" value={stats.totalToday} color="blue" />
        <MiniStat label="Received" value={stats.received} color="emerald" />
        <MiniStat label="Consumed" value={stats.consumed} color="orange" />
        <MiniStat label="Adjustments" value={stats.adjustments} color="slate" />
      </div>

      {viewMode === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Movement Trend (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Line type="monotone" dataKey="inbound" stroke="#059669" strokeWidth={2} name="Inbound" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="outbound" stroke="#dc2626" strokeWidth={2} name="Outbound" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} name="Total" dot={{ r: 4 }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Movement Type Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={typeDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                  {typeDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Top 10 Products by Movement Frequency</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" width={100} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Bar dataKey="count" fill="#2563eb" name="# Movements" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {viewMode === 'table' && (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by movement #, product, or reference..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }} className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white">
              <option value="all">All Types</option>
              {Object.entries(movementTypeConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }} className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white" />
              <span className="text-xs text-slate-400">to</span>
              <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }} className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white" />
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(''); setDateTo(''); setCurrentPage(1); }} className="text-xs text-slate-500 hover:text-slate-700">Clear</button>
              )}
            </div>
          </div>

          {filteredMovements.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <ArrowUpDown className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No stock movements found</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Movement #</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Type</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Product</th>
                      <th className="text-right px-4 py-3 font-medium text-slate-600">Qty</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">From / To</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Reference</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">By</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pageItems.map((m: any) => {
                      const conf = movementTypeConfig[m.movement_type] || { label: m.movement_type, color: 'text-slate-700', bg: 'bg-slate-50', icon: '?' };
                      const isPositive = ['goods_received', 'production_output', 'return'].includes(m.movement_type);
                      const isNegative = ['production_consume', 'scrap'].includes(m.movement_type);
                      return (
                        <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900">{m.movement_number}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${conf.bg} ${conf.color}`}>{conf.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-slate-800">{m.product?.name || 'N/A'}</p>
                            {m.product?.sku && <p className="text-[10px] text-slate-400">{m.product.sku}</p>}
                          </td>
                          <td className={`px-4 py-3 text-right font-semibold ${isPositive ? 'text-emerald-600' : isNegative ? 'text-red-600' : 'text-slate-800'}`}>
                            {isPositive ? '+' : isNegative ? '-' : ''}{Math.abs(Number(m.quantity)).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {m.from_location && <span>{m.from_location.location_code}</span>}
                            {m.from_location && m.to_location && <ArrowRight className="w-3 h-3 inline mx-1" />}
                            {m.to_location && <span>{m.to_location.location_code}</span>}
                            {!m.from_location && !m.to_location && <span>-</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {m.reference_number || (m.reason ? reasonOptions.find(r => r.value === m.reason)?.label : '-')}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{m.performed_by_profile?.full_name || '-'}</td>
                          <td className="px-4 py-3 text-xs text-slate-400">{format(new Date(m.performed_at), 'MMM d, h:mm a')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setCurrentPage} />
            </div>
          )}
        </>
      )}

      {formType === 'adjustment' && (
        <FormModal title="Stock Adjustment" onClose={() => setFormType(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Product *</label>
              <select value={adjustForm.product_id} onChange={e => setAdjustForm({ ...adjustForm, product_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
                <option value="">Select product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Quantity (positive = add, negative = remove) *</label>
              <input type="number" value={adjustForm.quantity} onChange={e => setAdjustForm({ ...adjustForm, quantity: Number(e.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Reason *</label>
              <select value={adjustForm.reason} onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
                {reasonOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
              <textarea value={adjustForm.notes} onChange={e => setAdjustForm({ ...adjustForm, notes: e.target.value })} rows={2} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm resize-none" />
            </div>
            <button onClick={handleAdjustment} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900">
              <Save className="w-4 h-4" /> Record Adjustment
            </button>
          </div>
        </FormModal>
      )}

      {formType === 'transfer' && (
        <FormModal title="Stock Transfer" onClose={() => setFormType(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Product *</label>
              <select value={transferForm.product_id} onChange={e => setTransferForm({ ...transferForm, product_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
                <option value="">Select product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Quantity *</label>
              <input type="number" min="1" value={transferForm.quantity} onChange={e => setTransferForm({ ...transferForm, quantity: Number(e.target.value) })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">From Location *</label>
                <select value={transferForm.from_location_id} onChange={e => setTransferForm({ ...transferForm, from_location_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
                  <option value="">Select...</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.location_code} - {l.location_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">To Location *</label>
                <select value={transferForm.to_location_id} onChange={e => setTransferForm({ ...transferForm, to_location_id: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
                  <option value="">Select...</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.location_code} - {l.location_name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
              <textarea value={transferForm.notes} onChange={e => setTransferForm({ ...transferForm, notes: e.target.value })} rows={2} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm resize-none" />
            </div>
            <button onClick={handleTransfer} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Save className="w-4 h-4" /> Record Transfer
            </button>
          </div>
        </FormModal>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-700',
    emerald: 'text-emerald-700',
    orange: 'text-orange-700',
    slate: 'text-slate-700',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className={`text-xl font-bold ${colorMap[color] || 'text-slate-700'} mt-1`}>{value}</p>
    </div>
  );
}

function FormModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
