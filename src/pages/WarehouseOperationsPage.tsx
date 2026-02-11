import React, { useState } from 'react';
import {
  Package,
  ArrowRightLeft,
  ClipboardCheck,
  Plus,
  Search,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Box
} from 'lucide-react';
import { useWarehouseTransfers, useContainers } from '../hooks/useLogistics';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { format } from 'date-fns';

type TabType = 'transfers' | 'cycle_counts' | 'containers';

export default function WarehouseOperationsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('transfers');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { transfers, loading: transfersLoading } = useWarehouseTransfers();
  const { containers, loading: containersLoading } = useContainers();

  const tabs = [
    { id: 'transfers' as TabType, label: 'Warehouse Transfers', icon: ArrowRightLeft, count: transfers.length },
    { id: 'cycle_counts' as TabType, label: 'Cycle Counts', icon: ClipboardCheck, count: 0 },
    { id: 'containers' as TabType, label: 'Containers', icon: Package, count: containers.length },
  ];

  // Transfer KPIs
  const transferKPIs = {
    total: transfers.length,
    draft: transfers.filter(t => t.status === 'draft').length,
    inTransit: transfers.filter(t => t.status === 'in_transit').length,
    received: transfers.filter(t => t.status === 'received').length,
    pendingApproval: transfers.filter(t => t.status === 'pending_approval').length,
  };

  // Container KPIs
  const containerKPIs = {
    total: containers.length,
    empty: containers.filter(c => c.status === 'empty').length,
    loaded: containers.filter(c => c.status === 'loaded').length,
    inTransit: containers.filter(c => c.status === 'in_transit').length,
    totalWeight: containers.reduce((sum, c) => sum + c.current_weight_kg, 0),
  };

  const filteredTransfers = transfers.filter(transfer => {
    const matchesSearch = transfer.transfer_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || transfer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredContainers = containers.filter(container => {
    const matchesSearch = container.container_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || container.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
      case 'empty':
        return 'bg-gray-100 text-gray-800';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
      case 'loaded':
        return 'bg-blue-100 text-blue-800';
      case 'in_transit':
      case 'loading':
        return 'bg-purple-100 text-purple-800';
      case 'received':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
      case 'damaged':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Warehouse Operations</h1>
          <p className="text-gray-600 mt-1">Manage transfers, cycle counts, and container tracking</p>
        </div>
        <Button
          onClick={() => {}}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create {activeTab === 'transfers' ? 'Transfer' : activeTab === 'containers' ? 'Container' : 'Count'}
        </Button>
      </div>

      {/* KPI Cards */}
      {activeTab === 'transfers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Transfers</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{transferKPIs.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ArrowRightLeft className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Transit</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{transferKPIs.inTransit}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{transferKPIs.pendingApproval}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Received</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{transferKPIs.received}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'containers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Containers</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{containerKPIs.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Empty</p>
                <p className="text-2xl font-bold text-gray-600 mt-1">{containerKPIs.empty}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Box className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Loaded</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{containerKPIs.loaded}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Weight</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{(containerKPIs.totalWeight / 1000).toFixed(1)}t</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
              <Badge variant="secondary">{tab.count}</Badge>
            </button>
          ))}
        </nav>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
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
          {activeTab === 'transfers' ? (
            <>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="in_transit">In Transit</option>
              <option value="received">Received</option>
            </>
          ) : (
            <>
              <option value="empty">Empty</option>
              <option value="loading">Loading</option>
              <option value="loaded">Loaded</option>
              <option value="in_transit">In Transit</option>
            </>
          )}
        </select>
      </div>

      {/* Content */}
      {activeTab === 'transfers' && (
        <div className="grid grid-cols-1 gap-4">
          {transfersLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading transfers...</p>
            </div>
          ) : filteredTransfers.length === 0 ? (
            <Card className="p-12 text-center">
              <ArrowRightLeft className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No transfers found</p>
            </Card>
          ) : (
            filteredTransfers.map((transfer) => (
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

                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'containers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {containersLoading ? (
            <div className="col-span-full text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading containers...</p>
            </div>
          ) : filteredContainers.length === 0 ? (
            <div className="col-span-full">
              <Card className="p-12 text-center">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No containers found</p>
              </Card>
            </div>
          ) : (
            filteredContainers.map((container) => (
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
                      <span className="font-medium">
                        {container.dimensions_length_m}m × {container.dimensions_width_m}m × {container.dimensions_height_m}m
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">Weight:</span>
                    <span className="font-medium">
                      {container.current_weight_kg.toFixed(0)} / {container.max_weight_kg} kg
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">Condition:</span>
                    <span className="font-medium capitalize">{container.condition}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">Ownership:</span>
                    <span className="font-medium capitalize">{container.ownership}</span>
                  </div>
                </div>

                {/* Weight Progress Bar */}
                {container.max_weight_kg && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Utilization</span>
                      <span>{((container.current_weight_kg / container.max_weight_kg) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min((container.current_weight_kg / container.max_weight_kg) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm" className="flex-1">
                    View Contents
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'cycle_counts' && (
        <Card className="p-12 text-center">
          <ClipboardCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Cycle Counting Module</h3>
          <p className="text-gray-600">Inventory cycle counting features coming soon</p>
        </Card>
      )}
    </div>
  );
}
