import { useState, useEffect, useCallback } from 'react';
import {
  Plus, X, Save, Check, ClipboardList, Package, AlertTriangle, TrendingUp, Search, Eye
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface CycleCountSession {
  id: string;
  session_number: string;
  location_id: string | null;
  status: string;
  scheduled_date: string;
  started_at: string | null;
  completed_at: string | null;
  counted_by_id: string | null;
  approved_by_id: string | null;
  notes: string | null;
  location?: { location_code: string; location_name: string };
  counted_by?: { full_name: string };
  approved_by?: { full_name: string };
  items?: CycleCountItem[];
}

interface CycleCountItem {
  id: string;
  product_id: string;
  system_quantity: number;
  counted_quantity: number | null;
  variance: number;
  product?: { name: string; sku: string };
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  planned: { label: 'Planned', color: 'text-blue-700', bg: 'bg-blue-100' },
  in_progress: { label: 'In Progress', color: 'text-amber-700', bg: 'bg-amber-100' },
  completed: { label: 'Completed', color: 'text-teal-700', bg: 'bg-teal-100' },
  approved: { label: 'Approved', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  cancelled: { label: 'Cancelled', color: 'text-slate-600', bg: 'bg-slate-100' },
};

export default function CycleCountingPanel() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<CycleCountSession[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedSession, setSelectedSession] = useState<CycleCountSession | null>(null);
  const [showCountForm, setShowCountForm] = useState(false);
  const [newForm, setNewForm] = useState({ location_id: '', scheduled_date: '', notes: '' });
  const [countData, setCountData] = useState<Record<string, number>>({});

  const loadData = useCallback(async () => {
    try {
      const [sessRes, locRes, prodRes] = await Promise.all([
        supabase
          .from('cycle_count_sessions')
          .select(`
            *,
            location:warehouse_locations(location_code, location_name),
            counted_by:profiles!cycle_count_sessions_counted_by_id_fkey(full_name),
            approved_by:profiles!cycle_count_sessions_approved_by_id_fkey(full_name)
          `)
          .order('scheduled_date', { ascending: false }),
        supabase.from('warehouse_locations').select('id, location_code, location_name').eq('is_active', true).order('location_code'),
        supabase.from('products').select('id, name, sku').eq('is_active', true).order('name'),
      ]);

      const sess = sessRes.data || [];
      setSessions(sess as any);
      setLocations(locRes.data || []);
      setProducts(prodRes.data || []);

      const sessIds = sess.map((s: any) => s.id);
      if (sessIds.length > 0) {
        const { data: items } = await supabase
          .from('cycle_count_items')
          .select('*, product:products(name, sku)')
          .in('cycle_count_session_id', sessIds);

        const itemsMap = (items || []).reduce((acc: any, item: any) => {
          if (!acc[item.cycle_count_session_id]) acc[item.cycle_count_session_id] = [];
          acc[item.cycle_count_session_id].push(item);
          return acc;
        }, {});

        setSessions(sess.map((s: any) => ({ ...s, items: itemsMap[s.id] || [] })));
      }
    } catch (err) {
      console.error('Failed to load cycle count data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateSession = async () => {
    if (!newForm.scheduled_date) {
      toast.error('Scheduled date is required');
      return;
    }
    try {
      const { data: session, error: sessErr } = await supabase
        .from('cycle_count_sessions')
        .insert({
          location_id: newForm.location_id || null,
          scheduled_date: newForm.scheduled_date,
          notes: newForm.notes || null,
        })
        .select('id')
        .single();

      if (sessErr || !session) throw sessErr;

      let productsToCount = products;
      if (newForm.location_id) {
        const { data: inv } = await supabase
          .from('product_inventory')
          .select('product_id, quantity_available')
          .eq('warehouse_location_id', newForm.location_id);

        const prodIds = (inv || []).map((i: any) => i.product_id);
        productsToCount = products.filter((p: any) => prodIds.includes(p.id));

        const items = (inv || []).map((i: any) => ({
          cycle_count_session_id: session.id,
          product_id: i.product_id,
          system_quantity: i.quantity_available,
        }));

        if (items.length > 0) {
          const { error: itemsErr } = await supabase.from('cycle_count_items').insert(items);
          if (itemsErr) throw itemsErr;
        }
      } else {
        const { data: inv } = await supabase.from('product_inventory').select('product_id, quantity_available');
        const items = (inv || []).map((i: any) => ({
          cycle_count_session_id: session.id,
          product_id: i.product_id,
          system_quantity: i.quantity_available || 0,
        }));

        if (items.length > 0) {
          const { error: itemsErr } = await supabase.from('cycle_count_items').insert(items);
          if (itemsErr) throw itemsErr;
        }
      }

      toast.success('Cycle count session created');
      setShowNewForm(false);
      setNewForm({ location_id: '', scheduled_date: '', notes: '' });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create session');
    }
  };

  const handleStartCount = async (sessionId: string) => {
    const { error } = await supabase
      .from('cycle_count_sessions')
      .update({ status: 'in_progress', started_at: new Date().toISOString(), counted_by_id: profile?.id })
      .eq('id', sessionId);
    if (error) toast.error('Failed to start count');
    else { toast.success('Count started'); loadData(); }
  };

  const handleSaveCounts = async () => {
    if (!selectedSession) return;
    try {
      for (const itemId in countData) {
        const { data: item } = await supabase
          .from('cycle_count_items')
          .select('system_quantity')
          .eq('id', itemId)
          .single();

        const variance = countData[itemId] - (item?.system_quantity || 0);
        await supabase
          .from('cycle_count_items')
          .update({ counted_quantity: countData[itemId], variance })
          .eq('id', itemId);
      }

      const { error } = await supabase
        .from('cycle_count_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', selectedSession.id);

      if (error) throw error;
      toast.success('Counts saved');
      setShowCountForm(false);
      setCountData({});
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save counts');
    }
  };

  const handleApprove = async (session: CycleCountSession) => {
    const { error } = await supabase
      .from('cycle_count_sessions')
      .update({ status: 'approved', approved_by_id: profile?.id })
      .eq('id', session.id);

    const items = session.items || [];
    for (const item of items) {
      if (item.variance !== 0 && item.counted_quantity !== null) {
        await supabase.from('stock_movements').insert({
          movement_number: `ADJ-${Date.now()}`,
          movement_type: 'adjustment',
          product_id: item.product_id,
          quantity: item.variance,
          reference_type: 'manual',
          reason: 'cycle_count',
          notes: `Cycle count adjustment from session ${session.session_number}`,
          performed_by: profile?.id,
        });

        await supabase
          .from('product_inventory')
          .update({ quantity_available: item.counted_quantity })
          .eq('product_id', item.product_id);
      }
    }

    if (error) toast.error('Failed to approve');
    else { toast.success('Session approved and inventory adjusted'); loadData(); }
  };

  const filteredSessions = sessions.filter(s => {
    const matchSearch = !searchTerm || s.session_number.toLowerCase().includes(searchTerm.toLowerCase()) || s.location?.location_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    planned: sessions.filter(s => s.status === 'planned').length,
    inProgress: sessions.filter(s => s.status === 'in_progress').length,
    completed: sessions.filter(s => s.status === 'completed').length,
    accuracy: sessions.length > 0 ? Math.round(
      sessions.filter(s => s.status === 'approved' && s.items && s.items.every(i => Math.abs(i.variance) === 0)).length / sessions.length * 100
    ) : 100,
  };

  if (loading) {
    return <div className="h-96 bg-white rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat icon={ClipboardList} label="Planned" value={stats.planned} color="blue" />
        <MiniStat icon={Package} label="In Progress" value={stats.inProgress} color="amber" />
        <MiniStat icon={Check} label="Completed" value={stats.completed} color="teal" />
        <MiniStat icon={TrendingUp} label="Accuracy Rate" value={`${stats.accuracy}%`} color="emerald" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
            <option value="all">All Status</option>
            {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <button
          onClick={() => { setShowNewForm(true); setNewForm({ location_id: '', scheduled_date: new Date().toISOString().split('T')[0], notes: '' }); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> New Count Session
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left font-medium text-slate-600">Session #</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Location</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Scheduled Date</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Items</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Variance</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Counted By</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSessions.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No cycle count sessions found</td></tr>
            ) : filteredSessions.map(session => {
              const sc = statusConfig[session.status] || statusConfig.planned;
              const totalVariance = (session.items || []).reduce((sum, i) => sum + Math.abs(i.variance || 0), 0);
              return (
                <tr key={session.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{session.session_number}</td>
                  <td className="px-4 py-3 text-slate-600">{session.location?.location_code || 'All Locations'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{format(new Date(session.scheduled_date), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3 text-slate-600">{session.items?.length || 0}</td>
                  <td className="px-4 py-3">
                    {totalVariance > 0 && <span className="text-red-600 font-medium">±{totalVariance}</span>}
                    {totalVariance === 0 && session.status === 'approved' && <span className="text-emerald-600">Perfect</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{session.counted_by?.full_name || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelectedSession(session)} className="p-1 text-slate-400 hover:text-blue-600" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                      {session.status === 'planned' && (
                        <button onClick={() => handleStartCount(session.id)} className="p-1 text-slate-400 hover:text-blue-600" title="Start">
                          <ClipboardList className="w-4 h-4" />
                        </button>
                      )}
                      {session.status === 'in_progress' && (
                        <button onClick={() => { setSelectedSession(session); setShowCountForm(true); }} className="p-1 text-slate-400 hover:text-emerald-600" title="Count">
                          <Package className="w-4 h-4" />
                        </button>
                      )}
                      {session.status === 'completed' && profile?.role && ['admin', 'manager'].includes(profile.role) && (
                        <button onClick={() => handleApprove(session)} className="p-1 text-slate-400 hover:text-emerald-600" title="Approve">
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showNewForm && (
        <Modal title="New Cycle Count Session" onClose={() => setShowNewForm(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location (optional)</label>
              <select value={newForm.location_id} onChange={e => setNewForm({ ...newForm, location_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                <option value="">All locations</option>
                {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.location_code} - {loc.location_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Scheduled Date *</label>
              <input type="date" value={newForm.scheduled_date} onChange={e => setNewForm({ ...newForm, scheduled_date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea value={newForm.notes} onChange={e => setNewForm({ ...newForm, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <button onClick={handleCreateSession} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Save className="w-4 h-4" /> Create Session
            </button>
          </div>
        </Modal>
      )}

      {showCountForm && selectedSession && (
        <CountFormModal
          session={selectedSession}
          countData={countData}
          setCountData={setCountData}
          onSave={handleSaveCounts}
          onClose={() => { setShowCountForm(false); setCountData({}); }}
        />
      )}

      {selectedSession && !showCountForm && (
        <SessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          onApprove={handleApprove}
          canApprove={profile?.role && ['admin', 'manager'].includes(profile.role)}
        />
      )}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-${color}-50`}>
          <Icon className={`w-4 h-4 text-${color}-600`} />
        </div>
        <div>
          <p className="text-[11px] text-slate-500 font-medium">{label}</p>
          <p className={`text-lg font-bold text-${color}-900`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="border-b border-slate-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function CountFormModal({ session, countData, setCountData, onSave, onClose }: any) {
  const items = session.items || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-slate-900">Enter Count Data</h2>
            <p className="text-xs text-slate-500 mt-0.5">{session.session_number}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6">
          <div className="space-y-2">
            {items.map((item: any) => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{item.product?.name}</p>
                  <p className="text-xs text-slate-500">{item.product?.sku}</p>
                </div>
                <div className="text-sm text-slate-600">
                  System: <span className="font-semibold">{item.system_quantity}</span>
                </div>
                <input
                  type="number"
                  min={0}
                  value={countData[item.id] ?? ''}
                  onChange={e => setCountData({ ...countData, [item.id]: parseInt(e.target.value) || 0 })}
                  placeholder="Count"
                  className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm text-center"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
            <Save className="w-4 h-4" /> Save Counts
          </button>
        </div>
      </div>
    </div>
  );
}

function SessionDetailModal({ session, onClose, onApprove, canApprove }: any) {
  const sc = statusConfig[session.status] || statusConfig.planned;
  const items = session.items || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-slate-900">{session.session_number}</h2>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>{sc.label}</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500">Location</span><p className="font-medium">{session.location?.location_code || 'All Locations'}</p></div>
            <div><span className="text-slate-500">Scheduled</span><p className="font-medium">{format(new Date(session.scheduled_date), 'MMM d, yyyy')}</p></div>
            <div><span className="text-slate-500">Counted By</span><p className="font-medium">{session.counted_by?.full_name || '-'}</p></div>
            {session.approved_by && (
              <div><span className="text-slate-500">Approved By</span><p className="font-medium">{session.approved_by.full_name}</p></div>
            )}
          </div>

          {session.notes && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Notes</h3>
              <p className="text-sm text-slate-600">{session.notes}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Count Results ({items.length} items)</h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-3 py-2 text-left font-medium text-slate-500">Product</th>
                    <th className="px-3 py-2 text-center font-medium text-slate-500">System Qty</th>
                    <th className="px-3 py-2 text-center font-medium text-slate-500">Counted</th>
                    <th className="px-3 py-2 text-center font-medium text-slate-500">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 text-slate-900">{item.product?.name || 'N/A'}</td>
                      <td className="px-3 py-2 text-center text-slate-600">{item.system_quantity}</td>
                      <td className="px-3 py-2 text-center font-medium text-blue-600">{item.counted_quantity ?? '-'}</td>
                      <td className="px-3 py-2 text-center font-medium">
                        {item.variance !== null && item.variance !== 0 ? (
                          <span className={item.variance > 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {item.variance > 0 ? '+' : ''}{item.variance}
                          </span>
                        ) : item.variance === 0 ? (
                          <span className="text-emerald-600">✓</span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {session.status === 'completed' && canApprove && (
            <div className="pt-4 border-t border-slate-200">
              <button onClick={() => { onApprove(session); onClose(); }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
                <Check className="w-4 h-4" /> Approve & Adjust Inventory
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
