import { useState, useEffect, useCallback } from 'react';
import {
  ArrowUpDown, Search, X, Save, ArrowRight, RotateCcw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const movementTypeConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  goods_received: { label: 'Goods Received', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: '+' },
  production_consume: { label: 'Production Use', color: 'text-orange-700', bg: 'bg-orange-50', icon: '-' },
  production_output: { label: 'Production Output', color: 'text-blue-700', bg: 'bg-blue-50', icon: '+' },
  adjustment: { label: 'Adjustment', color: 'text-slate-700', bg: 'bg-slate-50', icon: '~' },
  transfer: { label: 'Transfer', color: 'text-teal-700', bg: 'bg-teal-50', icon: '>' },
  scrap: { label: 'Scrap', color: 'text-red-700', bg: 'bg-red-50', icon: '-' },
  return: { label: 'Return', color: 'text-amber-700', bg: 'bg-amber-50', icon: '+' },
};

const reasonOptions = [
  { value: 'cycle_count', label: 'Cycle Count' },
  { value: 'damage', label: 'Damage' },
  { value: 'write_off', label: 'Write Off' },
  { value: 'correction', label: 'Correction' },
];

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

  const loadData = useCallback(async () => {
    try {
      const [movRes, prodRes, locRes] = await Promise.all([
        supabase.from('stock_movements')
          .select('*, product:products(name, sku), performed_by_profile:profiles!stock_movements_performed_by_fkey(full_name), from_location:warehouse_locations!stock_movements_from_location_id_fkey(location_code, location_name), to_location:warehouse_locations!stock_movements_to_location_id_fkey(location_code, location_name)')
          .order('performed_at', { ascending: false })
          .limit(200),
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
    return matchSearch && matchType;
  });

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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by movement #, product, or reference..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white">
          <option value="all">All Types</option>
          {Object.entries(movementTypeConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
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
                {filteredMovements.map(m => {
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
        </div>
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
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className={`text-xl font-bold text-${color}-700 mt-1`}>{value}</p>
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
