import { useState, useEffect } from 'react';
import { ShoppingCart, Search, Download, Eye, Plus, ArrowRight, Clock, FileText, ClipboardCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../lib/currencyUtils';
import { format } from 'date-fns';
import { exportProfessionalPOPDF } from '../lib/poPdfExport';
import GeneratePOModal from '../components/finance/GeneratePOModal';
import { RFQManagement } from '../components/purchasing/RFQManagement';
import POApprovalWorkflow from '../components/purchasing/POApprovalWorkflow';
import toast from 'react-hot-toast';

const poStatuses = ['draft', 'sent_to_supplier', 'acknowledged', 'drawing_approval', 'in_production', 'quality_check', 'shipped', 'delivered', 'closed'];
const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent_to_supplier: 'bg-blue-100 text-blue-700',
  acknowledged: 'bg-cyan-100 text-cyan-700',
  drawing_approval: 'bg-amber-100 text-amber-700',
  in_production: 'bg-teal-100 text-teal-700',
  quality_check: 'bg-orange-100 text-orange-700',
  shipped: 'bg-green-100 text-green-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-200 text-slate-600',
  cancelled: 'bg-red-100 text-red-700',
};

export default function PurchasingOrdersPage() {
  const { profile } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [wonQuotations, setWonQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'pos' | 'available' | 'rfq' | 'approvals'>('pos');
  const [showGeneratePO, setShowGeneratePO] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const [expandedPO, setExpandedPO] = useState<string | null>(null);
  const [poDetails, setPODetails] = useState<Record<string, any>>({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [posRes, quotRes] = await Promise.all([
        supabase.from('purchase_orders').select('*, quotation:quotations!inner(quotation_number, customer:customers!inner(company_name))').order('created_at', { ascending: false }),
        supabase.from('quotations').select('*, customer:customers!inner(company_name), quotation_items(*)').in('status', ['approved', 'deal_won']).order('created_at', { ascending: false }),
      ]);
      const allPOs = posRes.data || [];
      const existingQuotationIds = new Set(allPOs.map((po: any) => po.quotation_id));
      setWonQuotations((quotRes.data || []).filter((q: any) => !existingQuotationIds.has(q.id)));
      setPurchaseOrders(allPOs);
    } catch (err) {
      console.error('Failed to load PO data:', err);
    } finally {
      setLoading(false);
    }
  };

  const updatePOStatus = async (poId: string, currentStatus: string, newStatus: string) => {
    const { error } = await supabase.from('purchase_orders').update({ status: newStatus }).eq('id', poId);
    if (error) { toast.error('Failed to update status'); return; }
    await supabase.from('purchase_order_status_history').insert({
      purchase_order_id: poId,
      previous_status: currentStatus,
      new_status: newStatus,
      changed_by: profile?.id,
      notes: `Status changed from ${currentStatus} to ${newStatus}`,
    });

    const po = purchaseOrders.find(p => p.id === poId);
    if (po?.quotation_id) {
      const { data: jo } = await supabase.from('job_orders').select('id').eq('quotation_id', po.quotation_id).maybeSingle();
      if (jo) {
        await supabase.from('project_timeline_events').insert({
          job_order_id: jo.id,
          event_type: 'po_status_change',
          description: `PO ${po.po_number} status changed to ${newStatus.replace(/_/g, ' ')}`,
          triggered_by: profile?.id,
        });
      }
    }

    toast.success('PO status updated');
    loadData();
  };

  const loadPODetails = async (poId: string) => {
    if (poDetails[poId]) { setExpandedPO(expandedPO === poId ? null : poId); return; }
    const [itemsRes, histRes] = await Promise.all([
      supabase.from('purchase_order_items').select('*').eq('purchase_order_id', poId).order('sort_order'),
      supabase.from('purchase_order_status_history').select('*, changed_by_profile:profiles!purchase_order_status_history_changed_by_fkey(full_name)').eq('purchase_order_id', poId).order('changed_at', { ascending: false }),
    ]);
    setPODetails(prev => ({ ...prev, [poId]: { items: itemsRes.data || [], history: histRes.data || [] } }));
    setExpandedPO(poId);
  };

  const filtered = purchaseOrders.filter(po => {
    if (statusFilter !== 'all' && po.status !== statusFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return po.po_number?.toLowerCase().includes(s) || po.supplier_name?.toLowerCase().includes(s) || po.quotation?.quotation_number?.toLowerCase().includes(s) || po.quotation?.customer?.company_name?.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Purchase Orders</h1>
        <p className="text-sm text-slate-500 mt-1">Manage and track purchase orders</p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
        <button onClick={() => setActiveTab('pos')} className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'pos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
          <ShoppingCart className="w-4 h-4" /> Purchase Orders ({purchaseOrders.length})
        </button>
        <button onClick={() => setActiveTab('available')} className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'available' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
          <Plus className="w-4 h-4" /> Available to Generate ({wonQuotations.length})
        </button>
        <button onClick={() => setActiveTab('rfq')} className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'rfq' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
          <FileText className="w-4 h-4" /> RFQ Management
        </button>
        <button onClick={() => setActiveTab('approvals')} className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'approvals' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
          <ClipboardCheck className="w-4 h-4" /> PO Approvals
        </button>
      </div>

      {activeTab === 'pos' && (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search POs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
              <option value="all">All Status</option>
              {poStatuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-3 text-slate-600 font-medium">PO Number</th>
                    <th className="text-left p-3 text-slate-600 font-medium">Supplier</th>
                    <th className="text-left p-3 text-slate-600 font-medium">Quotation</th>
                    <th className="text-left p-3 text-slate-600 font-medium">Customer</th>
                    <th className="text-right p-3 text-slate-600 font-medium">Total</th>
                    <th className="text-center p-3 text-slate-600 font-medium">Status</th>
                    <th className="text-center p-3 text-slate-600 font-medium">Date</th>
                    <th className="text-center p-3 text-slate-600 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={8} className="p-8 text-center text-slate-500">Loading...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-slate-500">No purchase orders found</td></tr>
                  ) : filtered.map(po => (
                    <>
                      <tr key={po.id} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-blue-600">{po.po_number}</td>
                        <td className="p-3 text-slate-700">{po.supplier_name}</td>
                        <td className="p-3 text-slate-600">{po.quotation?.quotation_number}</td>
                        <td className="p-3 text-slate-600">{po.quotation?.customer?.company_name}</td>
                        <td className="p-3 text-right text-slate-900 font-medium">{formatCurrency(po.total)}</td>
                        <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[po.status] || ''}`}>{po.status?.replace(/_/g, ' ')}</span></td>
                        <td className="p-3 text-center text-slate-500">{format(new Date(po.po_date), 'MMM d, yy')}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => loadPODetails(po.id)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="View Details"><Eye className="w-4 h-4" /></button>
                            <button onClick={() => exportProfessionalPOPDF(po)} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded" title="Download PDF"><Download className="w-4 h-4" /></button>
                            {po.status !== 'closed' && po.status !== 'cancelled' && (
                              <select value="" onChange={e => { if (e.target.value) updatePOStatus(po.id, po.status, e.target.value); e.target.value = ''; }} className="text-xs border border-slate-200 rounded px-1 py-1">
                                <option value="">Update...</option>
                                {poStatuses.filter(s => s !== po.status).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                              </select>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedPO === po.id && poDetails[po.id] && (
                        <tr key={`${po.id}-detail`}>
                          <td colSpan={8} className="bg-slate-50 p-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-sm font-semibold text-slate-700 mb-2">Line Items</h4>
                                <table className="w-full text-xs">
                                  <thead><tr><th className="text-left p-1.5 text-slate-500">Item</th><th className="text-right p-1.5 text-slate-500">Qty</th><th className="text-right p-1.5 text-slate-500">Unit Cost</th><th className="text-right p-1.5 text-slate-500">Total</th></tr></thead>
                                  <tbody className="divide-y divide-slate-200">
                                    {poDetails[po.id].items.map((item: any) => (
                                      <tr key={item.id}><td className="p-1.5 text-slate-700">{item.description}</td><td className="p-1.5 text-right">{item.quantity}</td><td className="p-1.5 text-right">{formatCurrency(item.unit_cost)}</td><td className="p-1.5 text-right font-medium">{formatCurrency(item.line_total)}</td></tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-slate-700 mb-2">Status History</h4>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                  {poDetails[po.id].history.map((h: any) => (
                                    <div key={h.id} className="flex items-start gap-2 text-xs">
                                      <Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <span className="text-slate-700">{h.previous_status?.replace(/_/g, ' ')} {'\u2192'} {h.new_status?.replace(/_/g, ' ')}</span>
                                        <p className="text-slate-400">{h.changed_by_profile?.full_name} - {format(new Date(h.changed_at), 'MMM d, h:mm a')}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'available' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wonQuotations.length === 0 ? (
            <div className="col-span-full p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">No quotations available for PO generation</div>
          ) : wonQuotations.map(q => (
            <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-900">{q.quotation_number}</span>
                <span className="text-xs text-emerald-600 font-medium">{q.status}</span>
              </div>
              <p className="text-sm text-slate-600 mb-1">{q.customer?.company_name}</p>
              <p className="text-lg font-bold text-slate-900 mb-3">{formatCurrency(q.total)}</p>
              <button onClick={() => { setSelectedQuotation(q); setShowGeneratePO(true); }} className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                <Plus className="w-4 h-4" /> Generate PO
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'rfq' && <RFQManagement />}

      {activeTab === 'approvals' && <POApprovalWorkflow />}

      {showGeneratePO && selectedQuotation && (
        <GeneratePOModal quotation={selectedQuotation} onClose={() => { setShowGeneratePO(false); setSelectedQuotation(null); }} onSuccess={() => { setShowGeneratePO(false); setSelectedQuotation(null); loadData(); }} />
      )}
    </div>
  );
}
