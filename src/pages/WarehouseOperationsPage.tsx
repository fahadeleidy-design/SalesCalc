import { useState } from 'react';
import {
  Package,
  ArrowRightLeft,
  ClipboardCheck,
  Plus,
  Search,
  TrendingUp,
  CheckCircle,
  Clock,
  Box,
  Truck,
  RotateCcw,
  X,
  Save,
  Eye,
  AlertTriangle,
  FileText,
  Calendar,
  Download,
  ChevronRight,
} from 'lucide-react';
import { useWarehouseTransfers, useContainers } from '../hooks/useLogistics';
import { useGoodsReceipts, useReturnOrders, type GoodsReceiptNote, type GRNItem, type ReturnOrder, type ReturnOrderItem } from '../hooks/useWarehouse';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { format } from 'date-fns';
import CycleCountingPanel from '../components/warehouse/CycleCountingPanel';
import PickingPackingPanel from '../components/warehouse/PickingPackingPanel';

type TabType = 'transfers' | 'goods_receiving' | 'returns' | 'cycle_counts' | 'picking' | 'containers';

export default function WarehouseOperationsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('goods_receiving');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { transfers, loading: transfersLoading } = useWarehouseTransfers();
  const { containers, loading: containersLoading } = useContainers();
  const { receipts, loading: receiptsLoading, createReceipt, updateStatus: updateGrnStatus, loadItems: loadGrnItems } = useGoodsReceipts();
  const { returns, loading: returnsLoading, createReturn, updateStatus: updateReturnStatus, loadItems: loadReturnItems } = useReturnOrders();

  const [showGrnForm, setShowGrnForm] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [selectedGrn, setSelectedGrn] = useState<GoodsReceiptNote | null>(null);
  const [grnItems, setGrnItems] = useState<GRNItem[]>([]);
  const [selectedReturn, setSelectedReturn] = useState<ReturnOrder | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnOrderItem[]>([]);

  const tabs = [
    { id: 'goods_receiving' as TabType, label: 'Goods Receiving', icon: Package, count: receipts.length },
    { id: 'returns' as TabType, label: 'Returns', icon: RotateCcw, count: returns.length },
    { id: 'transfers' as TabType, label: 'Transfers', icon: ArrowRightLeft, count: transfers.length },
    { id: 'cycle_counts' as TabType, label: 'Cycle Counts', icon: ClipboardCheck, count: 0 },
    { id: 'picking' as TabType, label: 'Pick & Pack', icon: Truck, count: 0 },
    { id: 'containers' as TabType, label: 'Containers', icon: Box, count: containers.length },
  ];

  const grnKPIs = {
    total: receipts.length,
    draft: receipts.filter(r => r.status === 'draft').length,
    inspecting: receipts.filter(r => r.status === 'inspecting').length,
    accepted: receipts.filter(r => r.status === 'accepted').length,
    totalItems: receipts.reduce((s, r) => s + r.total_items, 0),
  };

  const returnKPIs = {
    total: returns.length,
    requested: returns.filter(r => r.status === 'requested').length,
    approved: returns.filter(r => r.status === 'approved').length,
    completed: returns.filter(r => r.status === 'completed').length,
    totalValue: returns.reduce((s, r) => s + Number(r.total_value || 0), 0),
  };

  const transferKPIs = {
    total: transfers.length,
    draft: transfers.filter(t => t.status === 'draft').length,
    inTransit: transfers.filter(t => t.status === 'in_transit').length,
    received: transfers.filter(t => t.status === 'received').length,
  };

  const containerKPIs = {
    total: containers.length,
    empty: containers.filter(c => c.status === 'empty').length,
    loaded: containers.filter(c => c.status === 'loaded').length,
    totalWeight: containers.reduce((sum, c) => sum + c.current_weight_kg, 0),
  };

  const filteredTransfers = transfers.filter(t => {
    const ms = t.transfer_number.toLowerCase().includes(searchTerm.toLowerCase());
    const mst = statusFilter === 'all' || t.status === statusFilter;
    return ms && mst;
  });

  const filteredReceipts = receipts.filter(r => {
    const ms = r.grn_number?.toLowerCase().includes(searchTerm.toLowerCase()) || r.delivery_note_ref?.toLowerCase().includes(searchTerm.toLowerCase());
    const mst = statusFilter === 'all' || r.status === statusFilter;
    return ms && mst;
  });

  const filteredReturns = returns.filter(r => {
    const ms = r.return_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const mst = statusFilter === 'all' || r.status === statusFilter;
    return ms && mst;
  });

  const filteredContainers = containers.filter(c => {
    const ms = c.container_number.toLowerCase().includes(searchTerm.toLowerCase());
    const mst = statusFilter === 'all' || c.status === statusFilter;
    return ms && mst;
  });

  const handleViewGrn = async (grn: GoodsReceiptNote) => {
    setSelectedGrn(grn);
    const items = await loadGrnItems(grn.id);
    setGrnItems(items);
  };

  const handleViewReturn = async (ret: ReturnOrder) => {
    setSelectedReturn(ret);
    const items = await loadReturnItems(ret.id);
    setReturnItems(items);
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      pending_approval: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      in_transit: 'bg-cyan-100 text-cyan-800',
      received: 'bg-green-100 text-green-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      empty: 'bg-gray-100 text-gray-800',
      loaded: 'bg-blue-100 text-blue-800',
      loading: 'bg-cyan-100 text-cyan-800',
      damaged: 'bg-red-100 text-red-800',
      inspecting: 'bg-amber-100 text-amber-800',
      accepted: 'bg-emerald-100 text-emerald-800',
      partial: 'bg-orange-100 text-orange-800',
      rejected: 'bg-red-100 text-red-800',
      requested: 'bg-yellow-100 text-yellow-800',
      receiving: 'bg-cyan-100 text-cyan-800',
      restocked: 'bg-teal-100 text-teal-800',
    };
    return map[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusFilters = () => {
    switch (activeTab) {
      case 'goods_receiving':
        return ['draft', 'inspecting', 'accepted', 'partial', 'rejected'];
      case 'returns':
        return ['requested', 'approved', 'receiving', 'inspecting', 'restocked', 'completed', 'rejected'];
      case 'transfers':
        return ['draft', 'pending_approval', 'approved', 'in_transit', 'received'];
      case 'containers':
        return ['empty', 'loading', 'loaded', 'in_transit'];
      default:
        return [];
    }
  };

  const handleCreateAction = () => {
    if (activeTab === 'goods_receiving') setShowGrnForm(true);
    else if (activeTab === 'returns') setShowReturnForm(true);
  };

  const showCreateButton = ['goods_receiving', 'returns', 'transfers'].includes(activeTab);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Warehouse Operations</h1>
          <p className="text-gray-600 mt-1">Manage receiving, returns, transfers, cycle counts, and picking</p>
        </div>
        {showCreateButton && (
          <Button onClick={handleCreateAction} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {activeTab === 'goods_receiving' ? 'New GRN' : activeTab === 'returns' ? 'New Return' : 'New Transfer'}
          </Button>
        )}
      </div>

      {activeTab === 'goods_receiving' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Total GRNs" value={grnKPIs.total} icon={FileText} color="blue" />
          <KPICard label="Draft" value={grnKPIs.draft} icon={Clock} color="gray" />
          <KPICard label="Inspecting" value={grnKPIs.inspecting} icon={AlertTriangle} color="amber" />
          <KPICard label="Accepted" value={grnKPIs.accepted} icon={CheckCircle} color="emerald" />
        </div>
      )}

      {activeTab === 'returns' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Total Returns" value={returnKPIs.total} icon={RotateCcw} color="blue" />
          <KPICard label="Requested" value={returnKPIs.requested} icon={Clock} color="yellow" />
          <KPICard label="Approved" value={returnKPIs.approved} icon={CheckCircle} color="cyan" />
          <KPICard label="Completed" value={returnKPIs.completed} icon={CheckCircle} color="emerald" />
        </div>
      )}

      {activeTab === 'transfers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Total Transfers" value={transferKPIs.total} icon={ArrowRightLeft} color="blue" />
          <KPICard label="Draft" value={transferKPIs.draft} icon={Clock} color="gray" />
          <KPICard label="In Transit" value={transferKPIs.inTransit} icon={TrendingUp} color="cyan" />
          <KPICard label="Received" value={transferKPIs.received} icon={CheckCircle} color="emerald" />
        </div>
      )}

      {activeTab === 'containers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Total Containers" value={containerKPIs.total} icon={Box} color="blue" />
          <KPICard label="Empty" value={containerKPIs.empty} icon={Box} color="gray" />
          <KPICard label="Loaded" value={containerKPIs.loaded} icon={Package} color="cyan" />
          <KPICard label="Total Weight" value={`${(containerKPIs.totalWeight / 1000).toFixed(1)}t`} icon={TrendingUp} color="teal" />
        </div>
      )}

      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setStatusFilter('all'); setSearchTerm(''); }}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
              {tab.count > 0 && <Badge variant="secondary">{tab.count}</Badge>}
            </button>
          ))}
        </nav>
      </div>

      {!['cycle_counts', 'picking'].includes(activeTab) && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={`Search ${activeTab.replace('_', ' ')}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            {getStatusFilters().map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
            ))}
          </select>
        </div>
      )}

      {activeTab === 'goods_receiving' && (
        <GoodsReceivingTab
          receipts={filteredReceipts}
          loading={receiptsLoading}
          getStatusColor={getStatusColor}
          onView={handleViewGrn}
          onUpdateStatus={updateGrnStatus}
        />
      )}

      {activeTab === 'returns' && (
        <ReturnsTab
          returns={filteredReturns}
          loading={returnsLoading}
          getStatusColor={getStatusColor}
          onView={handleViewReturn}
          onUpdateStatus={updateReturnStatus}
        />
      )}

      {activeTab === 'transfers' && (
        <TransfersTab transfers={filteredTransfers} loading={transfersLoading} getStatusColor={getStatusColor} />
      )}

      {activeTab === 'containers' && (
        <ContainersTab containers={filteredContainers} loading={containersLoading} getStatusColor={getStatusColor} />
      )}

      {activeTab === 'cycle_counts' && <CycleCountingPanel />}
      {activeTab === 'picking' && <PickingPackingPanel />}

      {showGrnForm && (
        <GRNFormModal
          onClose={() => setShowGrnForm(false)}
          onCreate={createReceipt}
        />
      )}

      {showReturnForm && (
        <ReturnFormModal
          onClose={() => setShowReturnForm(false)}
          onCreate={createReturn}
        />
      )}

      {selectedGrn && (
        <GRNDetailSlider
          grn={selectedGrn}
          items={grnItems}
          getStatusColor={getStatusColor}
          onClose={() => { setSelectedGrn(null); setGrnItems([]); }}
          onUpdateStatus={updateGrnStatus}
        />
      )}

      {selectedReturn && (
        <ReturnDetailSlider
          ret={selectedReturn}
          items={returnItems}
          getStatusColor={getStatusColor}
          onClose={() => { setSelectedReturn(null); setReturnItems([]); }}
          onUpdateStatus={updateReturnStatus}
        />
      )}
    </div>
  );
}

function KPICard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600', text: 'text-blue-700' },
    gray: { bg: 'bg-gray-100', icon: 'text-gray-600', text: 'text-gray-700' },
    amber: { bg: 'bg-amber-100', icon: 'text-amber-600', text: 'text-amber-700' },
    emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600', text: 'text-emerald-700' },
    yellow: { bg: 'bg-yellow-100', icon: 'text-yellow-600', text: 'text-yellow-700' },
    cyan: { bg: 'bg-cyan-100', icon: 'text-cyan-600', text: 'text-cyan-700' },
    teal: { bg: 'bg-teal-100', icon: 'text-teal-600', text: 'text-teal-700' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className={`text-2xl font-bold ${c.text} mt-1`}>{value}</p>
        </div>
        <div className={`w-12 h-12 ${c.bg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${c.icon}`} />
        </div>
      </div>
    </Card>
  );
}

function GoodsReceivingTab({ receipts, loading, getStatusColor, onView, onUpdateStatus }: {
  receipts: GoodsReceiptNote[];
  loading: boolean;
  getStatusColor: (s: string) => string;
  onView: (g: GoodsReceiptNote) => void;
  onUpdateStatus: (id: string, status: string) => void;
}) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
        <p className="text-gray-600 mt-4">Loading goods receipts...</p>
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Goods Receipts</h3>
        <p className="text-gray-600">Create a new GRN to start receiving goods</p>
      </Card>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600">GRN #</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Received Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Items</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Accepted</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Rejected</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Delivery Ref</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Received By</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {receipts.map(grn => (
              <tr key={grn.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{grn.grn_number}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{format(new Date(grn.received_date), 'MMM d, yyyy')}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(grn.status)}`}>
                    {grn.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-gray-600">{grn.total_items}</td>
                <td className="px-4 py-3 text-center text-emerald-600 font-medium">{grn.items_accepted}</td>
                <td className="px-4 py-3 text-center text-red-600 font-medium">{grn.items_rejected}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{grn.delivery_note_ref || '-'}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{grn.receiver?.full_name || '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => onView(grn)} className="p-1 text-gray-400 hover:text-blue-600" title="View">
                      <Eye className="w-4 h-4" />
                    </button>
                    {grn.status === 'draft' && (
                      <button onClick={() => onUpdateStatus(grn.id, 'inspecting')} className="p-1 text-gray-400 hover:text-amber-600" title="Start Inspection">
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                    )}
                    {grn.status === 'inspecting' && (
                      <button onClick={() => onUpdateStatus(grn.id, 'accepted')} className="p-1 text-gray-400 hover:text-emerald-600" title="Accept">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReturnsTab({ returns: retList, loading, getStatusColor, onView, onUpdateStatus }: {
  returns: ReturnOrder[];
  loading: boolean;
  getStatusColor: (s: string) => string;
  onView: (r: ReturnOrder) => void;
  onUpdateStatus: (id: string, status: string) => void;
}) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
        <p className="text-gray-600 mt-4">Loading returns...</p>
      </div>
    );
  }

  if (retList.length === 0) {
    return (
      <Card className="p-12 text-center">
        <RotateCcw className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Return Orders</h3>
        <p className="text-gray-600">Create a return order to process returns</p>
      </Card>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Return #</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Items</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Value</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Requested By</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {retList.map(ret => (
              <tr key={ret.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{ret.return_number}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-medium capitalize">{ret.return_type?.replace(/_/g, ' ')}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ret.status)}`}>
                    {ret.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{ret.customer?.company_name || '-'}</td>
                <td className="px-4 py-3 text-center text-gray-600">{ret.total_items}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">SAR {Number(ret.total_value || 0).toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{ret.requester?.full_name || '-'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{format(new Date(ret.created_at), 'MMM d, yyyy')}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => onView(ret)} className="p-1 text-gray-400 hover:text-blue-600" title="View">
                      <Eye className="w-4 h-4" />
                    </button>
                    {ret.status === 'requested' && (
                      <button onClick={() => onUpdateStatus(ret.id, 'approved')} className="p-1 text-gray-400 hover:text-emerald-600" title="Approve">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    {ret.status === 'approved' && (
                      <button onClick={() => onUpdateStatus(ret.id, 'receiving')} className="p-1 text-gray-400 hover:text-cyan-600" title="Start Receiving">
                        <Package className="w-4 h-4" />
                      </button>
                    )}
                    {ret.status === 'inspecting' && (
                      <button onClick={() => onUpdateStatus(ret.id, 'restocked')} className="p-1 text-gray-400 hover:text-teal-600" title="Restock">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TransfersTab({ transfers, loading, getStatusColor }: { transfers: any[]; loading: boolean; getStatusColor: (s: string) => string }) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
        <p className="text-gray-600 mt-4">Loading transfers...</p>
      </div>
    );
  }

  if (transfers.length === 0) {
    return (
      <Card className="p-12 text-center">
        <ArrowRightLeft className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No transfers found</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {transfers.map((transfer) => (
        <Card key={transfer.id} className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{transfer.transfer_number}</h3>
                <Badge className={getStatusColor(transfer.status)}>
                  {transfer.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <p className="text-sm text-gray-600">Transfer Date</p>
                  <p className="font-medium">{format(new Date(transfer.transfer_date), 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <p className="font-medium capitalize">{transfer.transfer_type}</p>
                </div>
                {transfer.estimated_arrival_date && (
                  <div>
                    <p className="text-sm text-gray-600">Est. Arrival</p>
                    <p className="font-medium">{format(new Date(transfer.estimated_arrival_date), 'MMM dd, yyyy')}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Shipping Cost</p>
                  <p className="font-medium">SAR {transfer.shipping_cost.toFixed(2)}</p>
                </div>
              </div>
              {transfer.notes && (
                <p className="text-sm text-gray-600 mt-3 italic">{transfer.notes}</p>
              )}
            </div>
            <Button variant="outline" size="sm">View Details</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function ContainersTab({ containers, loading, getStatusColor }: { containers: any[]; loading: boolean; getStatusColor: (s: string) => string }) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
        <p className="text-gray-600 mt-4">Loading containers...</p>
      </div>
    );
  }

  if (containers.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Box className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No containers found</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {containers.map((container) => (
        <Card key={container.id} className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{container.container_number}</h3>
              <p className="text-sm text-gray-600 capitalize">{container.container_type}</p>
            </div>
            <Badge className={getStatusColor(container.status)}>
              {container.status.replace('_', ' ')}
            </Badge>
          </div>
          <div className="space-y-3">
            {container.dimensions_length_m && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Dimensions:</span>
                <span className="font-medium">{container.dimensions_length_m}m x {container.dimensions_width_m}m x {container.dimensions_height_m}m</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Weight:</span>
              <span className="font-medium">{container.current_weight_kg.toFixed(0)} / {container.max_weight_kg} kg</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Condition:</span>
              <span className="font-medium capitalize">{container.condition}</span>
            </div>
          </div>
          {container.max_weight_kg > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Utilization</span>
                <span>{((container.current_weight_kg / container.max_weight_kg) * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((container.current_weight_kg / container.max_weight_kg) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function GRNFormModal({ onClose, onCreate }: { onClose: () => void; onCreate: (grn: Partial<GoodsReceiptNote>, items: Partial<GRNItem>[]) => Promise<boolean> }) {
  const [form, setForm] = useState({
    received_date: new Date().toISOString().split('T')[0],
    vehicle_number: '',
    driver_name: '',
    delivery_note_ref: '',
    notes: '',
  });
  const [items, setItems] = useState([{ product_name: '', expected_quantity: 0, received_quantity: 0, condition: 'good', unit_cost: 0, lot_number: '' }]);
  const [saving, setSaving] = useState(false);

  const addItem = () => setItems([...items, { product_name: '', expected_quantity: 0, received_quantity: 0, condition: 'good', unit_cost: 0, lot_number: '' }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const handleSave = async () => {
    const validItems = items.filter(i => i.product_name);
    if (validItems.length === 0) return;
    setSaving(true);
    const grn: Partial<GoodsReceiptNote> = {
      received_date: form.received_date,
      vehicle_number: form.vehicle_number || null,
      driver_name: form.driver_name || null,
      delivery_note_ref: form.delivery_note_ref || null,
      notes: form.notes || null,
      total_items: validItems.length,
      items_accepted: validItems.reduce((s, i) => s + i.received_quantity, 0),
      items_rejected: validItems.reduce((s, i) => s + Math.max(0, i.expected_quantity - i.received_quantity), 0),
    };
    const grnItems: Partial<GRNItem>[] = validItems.map(i => ({
      product_name: i.product_name,
      expected_quantity: i.expected_quantity,
      received_quantity: i.received_quantity,
      accepted_quantity: i.received_quantity,
      rejected_quantity: Math.max(0, i.expected_quantity - i.received_quantity),
      condition: i.condition,
      unit_cost: i.unit_cost,
      lot_number: i.lot_number || null,
    }));
    const ok = await onCreate(grn, grnItems);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-900">New Goods Receipt Note</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Received Date *</label>
              <input type="date" value={form.received_date} onChange={e => setForm({ ...form, received_date: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Delivery Note Ref</label>
              <input type="text" value={form.delivery_note_ref} onChange={e => setForm({ ...form, delivery_note_ref: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="DN-12345" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Vehicle Number</label>
              <input type="text" value={form.vehicle_number} onChange={e => setForm({ ...form, vehicle_number: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Driver Name</label>
              <input type="text" value={form.driver_name} onChange={e => setForm({ ...form, driver_name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Items</h3>
              <button onClick={addItem} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Item</button>
            </div>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Item {idx + 1}</span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(idx)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <input type="text" placeholder="Product Name *" value={item.product_name} onChange={e => { const n = [...items]; n[idx].product_name = e.target.value; setItems(n); }} className="px-2 py-1.5 border border-gray-200 rounded text-xs" />
                    <input type="number" placeholder="Expected Qty" min={0} value={item.expected_quantity || ''} onChange={e => { const n = [...items]; n[idx].expected_quantity = Number(e.target.value); setItems(n); }} className="px-2 py-1.5 border border-gray-200 rounded text-xs" />
                    <input type="number" placeholder="Received Qty" min={0} value={item.received_quantity || ''} onChange={e => { const n = [...items]; n[idx].received_quantity = Number(e.target.value); setItems(n); }} className="px-2 py-1.5 border border-gray-200 rounded text-xs" />
                    <select value={item.condition} onChange={e => { const n = [...items]; n[idx].condition = e.target.value; setItems(n); }} className="px-2 py-1.5 border border-gray-200 rounded text-xs">
                      <option value="good">Good</option>
                      <option value="damaged">Damaged</option>
                      <option value="defective">Defective</option>
                    </select>
                    <input type="number" placeholder="Unit Cost" min={0} step={0.01} value={item.unit_cost || ''} onChange={e => { const n = [...items]; n[idx].unit_cost = Number(e.target.value); setItems(n); }} className="px-2 py-1.5 border border-gray-200 rounded text-xs" />
                    <input type="text" placeholder="Lot #" value={item.lot_number} onChange={e => { const n = [...items]; n[idx].lot_number = e.target.value; setItems(n); }} className="px-2 py-1.5 border border-gray-200 rounded text-xs" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Creating...' : 'Create GRN'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReturnFormModal({ onClose, onCreate }: { onClose: () => void; onCreate: (ret: Partial<ReturnOrder>, items: Partial<ReturnOrderItem>[]) => Promise<boolean> }) {
  const [form, setForm] = useState({
    return_type: 'customer_return',
    reason: '',
    notes: '',
  });
  const [items, setItems] = useState([{ product_name: '', quantity: 0, condition: 'good', disposition: 'restock', unit_cost: 0 }]);
  const [saving, setSaving] = useState(false);

  const addItem = () => setItems([...items, { product_name: '', quantity: 0, condition: 'good', disposition: 'restock', unit_cost: 0 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const handleSave = async () => {
    const validItems = items.filter(i => i.product_name && i.quantity > 0);
    if (validItems.length === 0) return;
    setSaving(true);
    const ret: Partial<ReturnOrder> = {
      return_type: form.return_type,
      reason: form.reason || null,
      notes: form.notes || null,
      total_value: validItems.reduce((s, i) => s + i.quantity * i.unit_cost, 0),
    };
    const retItems: Partial<ReturnOrderItem>[] = validItems.map(i => ({
      product_name: i.product_name,
      quantity: i.quantity,
      condition: i.condition,
      disposition: i.disposition,
      unit_cost: i.unit_cost,
    }));
    const ok = await onCreate(ret, retItems);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-900">New Return Order</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Return Type *</label>
              <select value={form.return_type} onChange={e => setForm({ ...form, return_type: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <option value="customer_return">Customer Return</option>
                <option value="supplier_return">Supplier Return</option>
                <option value="internal">Internal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
              <input type="text" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Defective, Wrong item, etc." />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Items</h3>
              <button onClick={addItem} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Item</button>
            </div>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Item {idx + 1}</span>
                    {items.length > 1 && <button onClick={() => removeItem(idx)} className="text-xs text-red-500 hover:text-red-700">Remove</button>}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <input type="text" placeholder="Product Name *" value={item.product_name} onChange={e => { const n = [...items]; n[idx].product_name = e.target.value; setItems(n); }} className="px-2 py-1.5 border border-gray-200 rounded text-xs" />
                    <input type="number" placeholder="Qty *" min={1} value={item.quantity || ''} onChange={e => { const n = [...items]; n[idx].quantity = Number(e.target.value); setItems(n); }} className="px-2 py-1.5 border border-gray-200 rounded text-xs" />
                    <input type="number" placeholder="Unit Cost" min={0} step={0.01} value={item.unit_cost || ''} onChange={e => { const n = [...items]; n[idx].unit_cost = Number(e.target.value); setItems(n); }} className="px-2 py-1.5 border border-gray-200 rounded text-xs" />
                    <select value={item.condition} onChange={e => { const n = [...items]; n[idx].condition = e.target.value; setItems(n); }} className="px-2 py-1.5 border border-gray-200 rounded text-xs">
                      <option value="good">Good</option>
                      <option value="damaged">Damaged</option>
                      <option value="defective">Defective</option>
                      <option value="scrap">Scrap</option>
                    </select>
                    <select value={item.disposition} onChange={e => { const n = [...items]; n[idx].disposition = e.target.value; setItems(n); }} className="px-2 py-1.5 border border-gray-200 rounded text-xs">
                      <option value="restock">Restock</option>
                      <option value="repair">Repair</option>
                      <option value="scrap">Scrap</option>
                      <option value="return_to_supplier">Return to Supplier</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Creating...' : 'Create Return'}
          </button>
        </div>
      </div>
    </div>
  );
}

function GRNDetailSlider({ grn, items, getStatusColor, onClose, onUpdateStatus }: {
  grn: GoodsReceiptNote;
  items: GRNItem[];
  getStatusColor: (s: string) => string;
  onClose: () => void;
  onUpdateStatus: (id: string, status: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-gray-900">{grn.grn_number}</h2>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(grn.status)}`}>
              {grn.status.replace(/_/g, ' ')}
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Received Date</span><p className="font-medium">{format(new Date(grn.received_date), 'MMM d, yyyy')}</p></div>
            <div><span className="text-gray-500">Received By</span><p className="font-medium">{grn.receiver?.full_name || '-'}</p></div>
            <div><span className="text-gray-500">Vehicle</span><p className="font-medium">{grn.vehicle_number || '-'}</p></div>
            <div><span className="text-gray-500">Driver</span><p className="font-medium">{grn.driver_name || '-'}</p></div>
            <div><span className="text-gray-500">Delivery Ref</span><p className="font-medium">{grn.delivery_note_ref || '-'}</p></div>
            <div><span className="text-gray-500">Total Items</span><p className="font-medium">{grn.total_items}</p></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <p className="text-xs text-blue-600 font-medium">Total</p>
              <p className="text-xl font-bold text-blue-700">{grn.total_items}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg text-center">
              <p className="text-xs text-emerald-600 font-medium">Accepted</p>
              <p className="text-xl font-bold text-emerald-700">{grn.items_accepted}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg text-center">
              <p className="text-xs text-red-600 font-medium">Rejected</p>
              <p className="text-xl font-bold text-red-700">{grn.items_rejected}</p>
            </div>
          </div>

          {grn.notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Notes</h3>
              <p className="text-sm text-gray-600">{grn.notes}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Items ({items.length})</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Product</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500">Expected</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500">Received</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500">Condition</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500">Lot #</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map(item => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 text-gray-900 font-medium">
                        {item.product?.name || item.product_name || 'N/A'}
                        {item.product?.sku && <span className="text-[10px] text-gray-400 block">{item.product.sku}</span>}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600">{item.expected_quantity}</td>
                      <td className="px-3 py-2 text-center font-medium text-blue-600">{item.received_quantity}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          item.condition === 'good' ? 'bg-emerald-100 text-emerald-700' :
                          item.condition === 'damaged' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>{item.condition}</span>
                      </td>
                      <td className="px-3 py-2 text-center text-gray-500">{item.lot_number || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {grn.status === 'draft' && (
            <div className="pt-4 border-t border-gray-200 flex gap-3">
              <button onClick={() => { onUpdateStatus(grn.id, 'inspecting'); onClose(); }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700">
                <AlertTriangle className="w-4 h-4" /> Start Inspection
              </button>
            </div>
          )}
          {grn.status === 'inspecting' && (
            <div className="pt-4 border-t border-gray-200 flex gap-3">
              <button onClick={() => { onUpdateStatus(grn.id, 'accepted'); onClose(); }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
                <CheckCircle className="w-4 h-4" /> Accept All
              </button>
              <button onClick={() => { onUpdateStatus(grn.id, 'partial'); onClose(); }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-50">
                Partial Accept
              </button>
              <button onClick={() => { onUpdateStatus(grn.id, 'rejected'); onClose(); }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 border border-red-200 rounded-lg hover:bg-red-50">
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReturnDetailSlider({ ret, items, getStatusColor, onClose, onUpdateStatus }: {
  ret: ReturnOrder;
  items: ReturnOrderItem[];
  getStatusColor: (s: string) => string;
  onClose: () => void;
  onUpdateStatus: (id: string, status: string) => void;
}) {
  const conditionColor = (c: string) => {
    const map: Record<string, string> = { good: 'bg-emerald-100 text-emerald-700', damaged: 'bg-red-100 text-red-700', defective: 'bg-amber-100 text-amber-700', scrap: 'bg-gray-100 text-gray-700' };
    return map[c] || 'bg-gray-100 text-gray-700';
  };
  const dispositionColor = (d: string) => {
    const map: Record<string, string> = { restock: 'bg-emerald-100 text-emerald-700', repair: 'bg-blue-100 text-blue-700', scrap: 'bg-red-100 text-red-700', return_to_supplier: 'bg-amber-100 text-amber-700' };
    return map[d] || 'bg-gray-100 text-gray-700';
  };

  const nextStatus: Record<string, { label: string; status: string; color: string }> = {
    requested: { label: 'Approve', status: 'approved', color: 'bg-blue-600 hover:bg-blue-700' },
    approved: { label: 'Start Receiving', status: 'receiving', color: 'bg-cyan-600 hover:bg-cyan-700' },
    receiving: { label: 'Start Inspection', status: 'inspecting', color: 'bg-amber-600 hover:bg-amber-700' },
    inspecting: { label: 'Mark Restocked', status: 'restocked', color: 'bg-teal-600 hover:bg-teal-700' },
    restocked: { label: 'Complete', status: 'completed', color: 'bg-emerald-600 hover:bg-emerald-700' },
  };

  const next = nextStatus[ret.status];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-gray-900">{ret.return_number}</h2>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ret.status)}`}>
              {ret.status.replace(/_/g, ' ')}
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Return Type</span><p className="font-medium capitalize">{ret.return_type?.replace(/_/g, ' ')}</p></div>
            <div><span className="text-gray-500">Customer</span><p className="font-medium">{ret.customer?.company_name || '-'}</p></div>
            <div><span className="text-gray-500">Requested By</span><p className="font-medium">{ret.requester?.full_name || '-'}</p></div>
            <div><span className="text-gray-500">Approved By</span><p className="font-medium">{ret.approver?.full_name || '-'}</p></div>
            <div><span className="text-gray-500">Total Items</span><p className="font-medium">{ret.total_items}</p></div>
            <div><span className="text-gray-500">Total Value</span><p className="font-medium text-gray-900">SAR {Number(ret.total_value || 0).toLocaleString()}</p></div>
          </div>

          {ret.reason && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Reason</h3>
              <p className="text-sm text-gray-600">{ret.reason}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Items ({items.length})</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Product</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500">Qty</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500">Condition</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500">Disposition</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map(item => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 text-gray-900 font-medium">
                        {item.product?.name || item.product_name || 'N/A'}
                        {item.product?.sku && <span className="text-[10px] text-gray-400 block">{item.product.sku}</span>}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-600">{item.quantity}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${conditionColor(item.condition)}`}>
                          {item.condition}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${dispositionColor(item.disposition)}`}>
                          {item.disposition.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">SAR {(item.quantity * item.unit_cost).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {next && (
            <div className="pt-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => { onUpdateStatus(ret.id, next.status); onClose(); }}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg ${next.color}`}
              >
                <ChevronRight className="w-4 h-4" /> {next.label}
              </button>
              {ret.status === 'requested' && (
                <button
                  onClick={() => { onUpdateStatus(ret.id, 'rejected'); onClose(); }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 border border-red-200 rounded-lg hover:bg-red-50"
                >
                  Reject
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
