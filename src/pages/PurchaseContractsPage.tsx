import { useState } from 'react';
import {
  FileText, Plus, Search, Calendar, DollarSign, AlertTriangle,
  CheckCircle, Clock, XCircle, ChevronDown, ChevronUp, Building2,
  RefreshCw, Shield, Truck, Package
} from 'lucide-react';
import { usePurchaseContracts, PurchaseContract, PurchaseContractItem } from '../hooks/usePurchasing';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../lib/currencyUtils';
import { format, differenceInDays, isPast, addDays } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

type TabKey = 'all' | 'active' | 'expiring' | 'expired' | 'draft';

export default function PurchaseContractsPage() {
  const { contracts, loading, createContract, updateContract } = usePurchaseContracts();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [expandedContract, setExpandedContract] = useState<string | null>(null);
  const [contractItems, setContractItems] = useState<PurchaseContractItem[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const loadSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('id, supplier_name').order('supplier_name');
    setSuppliers(data || []);
  };

  const loadContractItems = async (contractId: string) => {
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from('purchase_contract_items')
        .select('*')
        .eq('contract_id', contractId)
        .order('material_name');
      if (error) throw error;
      setContractItems(data || []);
    } catch {
      toast.error('Failed to load contract items');
    } finally {
      setLoadingItems(false);
    }
  };

  const toggleExpand = (contractId: string) => {
    if (expandedContract === contractId) {
      setExpandedContract(null);
      setContractItems([]);
    } else {
      setExpandedContract(contractId);
      loadContractItems(contractId);
    }
  };

  const now = new Date();
  const expiringThreshold = addDays(now, 30);

  const filteredContracts = contracts.filter(c => {
    const matchesSearch = !searchTerm ||
      c.contract_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contract_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.suppliers?.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const endDate = new Date(c.end_date);
    const isExpiring = !isPast(endDate) && differenceInDays(endDate, now) <= 30;

    switch (activeTab) {
      case 'active': return matchesSearch && c.status === 'active';
      case 'expiring': return matchesSearch && c.status === 'active' && isExpiring;
      case 'expired': return matchesSearch && (c.status === 'expired' || isPast(endDate));
      case 'draft': return matchesSearch && c.status === 'draft';
      default: return matchesSearch;
    }
  });

  const activeContracts = contracts.filter(c => c.status === 'active');
  const expiringContracts = activeContracts.filter(c => {
    const endDate = new Date(c.end_date);
    return !isPast(endDate) && differenceInDays(endDate, now) <= 30;
  });
  const totalContractValue = activeContracts.reduce((sum, c) => sum + (c.total_value || 0), 0);
  const totalCommittedSpend = activeContracts.reduce((sum, c) => sum + c.committed_spend, 0);
  const totalActualSpend = activeContracts.reduce((sum, c) => sum + c.actual_spend, 0);

  const getStatusConfig = (status: string, endDate: string) => {
    const end = new Date(endDate);
    const daysLeft = differenceInDays(end, now);
    if (isPast(end) && status !== 'terminated') {
      return { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Expired' };
    }
    switch (status) {
      case 'active':
        if (daysLeft <= 30) return { color: 'bg-amber-100 text-amber-800', icon: AlertTriangle, label: 'Expiring Soon' };
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Active' };
      case 'draft': return { color: 'bg-slate-100 text-slate-700', icon: Clock, label: 'Draft' };
      case 'terminated': return { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Terminated' };
      case 'suspended': return { color: 'bg-amber-100 text-amber-800', icon: AlertTriangle, label: 'Suspended' };
      default: return { color: 'bg-slate-100 text-slate-700', icon: Clock, label: status };
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'blanket': return 'Blanket Order';
      case 'fixed_price': return 'Fixed Price';
      case 'volume_discount': return 'Volume Discount';
      case 'framework': return 'Framework';
      case 'spot': return 'Spot Purchase';
      default: return type;
    }
  };

  const getUtilization = (c: PurchaseContract) => {
    if (!c.total_value || c.total_value === 0) return 0;
    return Math.min((c.actual_spend / c.total_value) * 100, 100);
  };

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'all', label: 'All Contracts', count: contracts.length },
    { key: 'active', label: 'Active', count: activeContracts.length },
    { key: 'expiring', label: 'Expiring Soon', count: expiringContracts.length },
    { key: 'expired', label: 'Expired', count: contracts.filter(c => c.status === 'expired' || isPast(new Date(c.end_date))).length },
    { key: 'draft', label: 'Drafts', count: contracts.filter(c => c.status === 'draft').length },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />)}
        </div>
        <div className="h-96 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchase Contracts</h1>
          <p className="text-sm text-slate-500 mt-1">Manage supplier agreements, pricing terms, and contract lifecycle</p>
        </div>
        <Button
          onClick={() => { setShowCreateModal(true); loadSuppliers(); }}
          icon={<Plus className="w-4 h-4" />}
        >
          New Contract
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5" hover={false}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Active Contracts</p>
              <p className="text-xl font-bold text-slate-900">{activeContracts.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5" hover={false}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Contract Value</p>
              <p className="text-xl font-bold text-emerald-700">{formatCurrency(totalContractValue)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5" hover={false}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-50">
              <Shield className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Committed Spend</p>
              <p className="text-xl font-bold text-cyan-700">{formatCurrency(totalCommittedSpend)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5" hover={false}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Expiring (30 days)</p>
              <p className="text-xl font-bold text-amber-700">{expiringContracts.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card hover={false}>
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex gap-1 overflow-x-auto pb-1">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.key
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                  <span className="ml-1.5 text-xs opacity-70">({tab.count})</span>
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search contracts..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredContracts.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No contracts found</p>
            </div>
          ) : (
            filteredContracts.map(contract => {
              const statusConfig = getStatusConfig(contract.status, contract.end_date);
              const StatusIcon = statusConfig.icon;
              const utilization = getUtilization(contract);
              const daysRemaining = differenceInDays(new Date(contract.end_date), now);
              const isExpanded = expandedContract === contract.id;

              return (
                <div key={contract.id}>
                  <div
                    className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => toggleExpand(contract.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-slate-100 mt-0.5">
                        <FileText className="w-5 h-5 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900">{contract.contract_number}</span>
                          <Badge className={statusConfig.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                          <Badge className="bg-slate-100 text-slate-600">
                            {getTypeLabel(contract.contract_type)}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-700 mt-1 font-medium">{contract.contract_name}</p>

                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                          {contract.suppliers?.supplier_name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5" />
                              {contract.suppliers.supplier_name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(contract.start_date), 'MMM d, yyyy')} - {format(new Date(contract.end_date), 'MMM d, yyyy')}
                          </span>
                          {contract.auto_renew && (
                            <span className="flex items-center gap-1 text-blue-600">
                              <RefreshCw className="w-3.5 h-3.5" />
                              Auto-renew
                            </span>
                          )}
                          {daysRemaining > 0 && daysRemaining <= 90 && (
                            <span className={`font-medium ${daysRemaining <= 30 ? 'text-red-600' : 'text-amber-600'}`}>
                              {daysRemaining} days remaining
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-6 mt-3">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Value</p>
                            <p className="text-sm font-bold text-slate-900">{formatCurrency(contract.total_value || 0)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Actual Spend</p>
                            <p className="text-sm font-bold text-blue-600">{formatCurrency(contract.actual_spend)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Remaining</p>
                            <p className="text-sm font-bold text-emerald-600">{formatCurrency(contract.remaining_value)}</p>
                          </div>
                          <div className="flex-1 max-w-48">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Utilization</p>
                              <p className="text-xs font-semibold text-slate-700">{utilization.toFixed(0)}%</p>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all ${
                                  utilization >= 90 ? 'bg-red-500' :
                                  utilization >= 70 ? 'bg-amber-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${utilization}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isExpanded
                          ? <ChevronUp className="w-5 h-5 text-slate-400" />
                          : <ChevronDown className="w-5 h-5 text-slate-400" />
                        }
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 bg-slate-50 border-t border-slate-100">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 mb-4">
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <p className="text-xs text-slate-500">Payment Terms</p>
                          <p className="text-sm font-medium text-slate-900 mt-0.5">{contract.payment_terms || '—'}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <p className="text-xs text-slate-500">Delivery Terms</p>
                          <p className="text-sm font-medium text-slate-900 mt-0.5">{contract.delivery_terms || '—'}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <p className="text-xs text-slate-500">Min Order Value</p>
                          <p className="text-sm font-medium text-slate-900 mt-0.5">{contract.min_order_value ? formatCurrency(contract.min_order_value) : '—'}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200">
                          <p className="text-xs text-slate-500">Max Order Value</p>
                          <p className="text-sm font-medium text-slate-900 mt-0.5">{contract.max_order_value ? formatCurrency(contract.max_order_value) : '—'}</p>
                        </div>
                      </div>

                      {contract.quality_requirements && (
                        <div className="bg-white p-3 rounded-lg border border-slate-200 mb-4">
                          <p className="text-xs text-slate-500 mb-1">Quality Requirements</p>
                          <p className="text-sm text-slate-700">{contract.quality_requirements}</p>
                        </div>
                      )}

                      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-slate-900">Contract Line Items</h4>
                          <span className="text-xs text-slate-500">{contractItems.length} items</span>
                        </div>
                        {loadingItems ? (
                          <div className="p-6 text-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
                          </div>
                        ) : contractItems.length === 0 ? (
                          <div className="p-6 text-center text-sm text-slate-400">No line items</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-slate-50 text-left">
                                  <th className="px-4 py-2 text-xs font-medium text-slate-500">Material</th>
                                  <th className="px-4 py-2 text-xs font-medium text-slate-500">Code</th>
                                  <th className="px-4 py-2 text-xs font-medium text-slate-500 text-right">Agreed Price</th>
                                  <th className="px-4 py-2 text-xs font-medium text-slate-500 text-right">Min Qty</th>
                                  <th className="px-4 py-2 text-xs font-medium text-slate-500 text-right">Max Qty</th>
                                  <th className="px-4 py-2 text-xs font-medium text-slate-500 text-right">Ordered</th>
                                  <th className="px-4 py-2 text-xs font-medium text-slate-500 text-right">Delivered</th>
                                  <th className="px-4 py-2 text-xs font-medium text-slate-500">Lead Time</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {contractItems.map(item => (
                                  <tr key={item.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-2.5 font-medium text-slate-900">{item.material_name}</td>
                                    <td className="px-4 py-2.5 text-slate-500">{item.material_code || '—'}</td>
                                    <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(item.agreed_price)}/{item.unit_of_measure}</td>
                                    <td className="px-4 py-2.5 text-right text-slate-600">{item.min_quantity ?? '—'}</td>
                                    <td className="px-4 py-2.5 text-right text-slate-600">{item.max_quantity ?? '—'}</td>
                                    <td className="px-4 py-2.5 text-right text-blue-600 font-medium">{item.ordered_quantity}</td>
                                    <td className="px-4 py-2.5 text-right text-emerald-600 font-medium">{item.delivered_quantity}</td>
                                    <td className="px-4 py-2.5 text-slate-500">{item.lead_time_days ? `${item.lead_time_days} days` : '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 mt-4">
                        {contract.status === 'draft' && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateContract(contract.id, { status: 'active' });
                            }}
                            icon={<CheckCircle className="w-4 h-4" />}
                          >
                            Activate
                          </Button>
                        )}
                        {contract.status === 'active' && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateContract(contract.id, { status: 'suspended' });
                            }}
                          >
                            Suspend
                          </Button>
                        )}
                        {contract.status === 'suspended' && (
                          <Button
                            size="sm"
                            variant="success"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateContract(contract.id, { status: 'active' });
                            }}
                          >
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>

      {showCreateModal && (
        <CreateContractModal
          suppliers={suppliers}
          onClose={() => setShowCreateModal(false)}
          onCreate={createContract}
        />
      )}
    </div>
  );
}

function CreateContractModal({
  suppliers,
  onClose,
  onCreate,
}: {
  suppliers: any[];
  onClose: () => void;
  onCreate: (data: Partial<PurchaseContract>, items: Partial<PurchaseContractItem>[]) => Promise<any>;
}) {
  const [form, setForm] = useState({
    contract_name: '',
    supplier_id: '',
    contract_type: 'blanket',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(addDays(new Date(), 365), 'yyyy-MM-dd'),
    auto_renew: false,
    renewal_notice_days: 30,
    currency: 'SAR',
    total_value: '',
    payment_terms: 'Net 30',
    delivery_terms: '',
    quality_requirements: '',
    notes: '',
  });
  const [items, setItems] = useState<Partial<PurchaseContractItem>[]>([]);
  const [saving, setSaving] = useState(false);

  const addItem = () => {
    setItems([...items, {
      material_name: '',
      material_code: '',
      unit_of_measure: 'pcs',
      agreed_price: 0,
      min_quantity: 0,
      max_quantity: 0,
      lead_time_days: 7,
    }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!form.contract_name || !form.supplier_id) {
      toast.error('Contract name and supplier are required');
      return;
    }
    setSaving(true);
    try {
      await onCreate(
        {
          ...form,
          total_value: form.total_value ? parseFloat(form.total_value) : undefined,
          status: 'draft',
        } as any,
        items
      );
      onClose();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-12 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl m-4">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">New Purchase Contract</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Contract Name</label>
              <input
                type="text"
                value={form.contract_name}
                onChange={e => setForm({ ...form, contract_name: e.target.value })}
                placeholder="e.g., Annual Hardwood Supply Agreement"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
              <select
                value={form.supplier_id}
                onChange={e => setForm({ ...form, supplier_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select supplier...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.supplier_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contract Type</label>
              <select
                value={form.contract_type}
                onChange={e => setForm({ ...form, contract_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="blanket">Blanket Order</option>
                <option value="fixed_price">Fixed Price</option>
                <option value="volume_discount">Volume Discount</option>
                <option value="framework">Framework Agreement</option>
                <option value="spot">Spot Purchase</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm({ ...form, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Total Value ({form.currency})</label>
              <input
                type="number"
                value={form.total_value}
                onChange={e => setForm({ ...form, total_value: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms</label>
              <select
                value={form.payment_terms}
                onChange={e => setForm({ ...form, payment_terms: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 45">Net 45</option>
                <option value="Net 60">Net 60</option>
                <option value="Net 90">Net 90</option>
                <option value="COD">Cash on Delivery</option>
                <option value="Advance">Advance Payment</option>
              </select>
            </div>

            <div className="col-span-2 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.auto_renew}
                  onChange={e => setForm({ ...form, auto_renew: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">Auto-renew contract</span>
              </label>
              {form.auto_renew && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Notice period:</span>
                  <input
                    type="number"
                    value={form.renewal_notice_days}
                    onChange={e => setForm({ ...form, renewal_notice_days: parseInt(e.target.value) || 30 })}
                    className="w-20 px-2 py-1 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="text-sm text-slate-500">days</span>
                </div>
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Quality Requirements</label>
              <textarea
                value={form.quality_requirements}
                onChange={e => setForm({ ...form, quality_requirements: e.target.value })}
                rows={2}
                placeholder="ISO certification, material grade, testing requirements..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Contract Line Items</h3>
              <button
                onClick={addItem}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No items added yet</p>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                    <div className="grid grid-cols-6 gap-2">
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={item.material_name || ''}
                          onChange={e => updateItem(index, 'material_name', e.target.value)}
                          placeholder="Material name"
                          className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={item.material_code || ''}
                          onChange={e => updateItem(index, 'material_code', e.target.value)}
                          placeholder="Code"
                          className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          value={item.agreed_price || ''}
                          onChange={e => updateItem(index, 'agreed_price', parseFloat(e.target.value) || 0)}
                          placeholder="Price"
                          className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <select
                          value={item.unit_of_measure || 'pcs'}
                          onChange={e => updateItem(index, 'unit_of_measure', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                        >
                          <option value="pcs">pcs</option>
                          <option value="kg">kg</option>
                          <option value="m">m</option>
                          <option value="m2">m2</option>
                          <option value="m3">m3</option>
                          <option value="sheet">sheet</option>
                          <option value="roll">roll</option>
                          <option value="set">set</option>
                        </select>
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving}>Create Contract</Button>
        </div>
      </div>
    </div>
  );
}
