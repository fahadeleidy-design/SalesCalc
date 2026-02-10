import React, { useState } from 'react';
import {
  Plug,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Play,
  Pause,
  RefreshCw,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Integration {
  id: string;
  name: string;
  type: 'api' | 'webhook' | 'ftp' | 'database' | 'manual';
  status: 'connected' | 'disconnected';
  color: string;
  initials: string;
  lastSync?: string;
}

interface SyncLog {
  id: string;
  timestamp: string;
  integrationName: string;
  syncType: 'inbound' | 'outbound';
  status: 'success' | 'failed' | 'in_progress';
  recordsProcessed: number;
  duration: string;
}

interface IntegrationConfig {
  name: string;
  endpoint: string;
  authMethod: 'api_key' | 'oauth' | 'basic' | 'none';
  credentials: string;
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual';
  enabled: boolean;
}

const initialIntegrations: Integration[] = [
  { id: '1', name: 'SAP ERP', type: 'api', status: 'disconnected', color: 'bg-green-500', initials: 'SAP' },
  { id: '2', name: 'NetSuite', type: 'api', status: 'disconnected', color: 'bg-blue-500', initials: 'NS' },
  { id: '3', name: 'Shopify', type: 'api', status: 'disconnected', color: 'bg-teal-500', initials: 'SH' },
  { id: '4', name: 'Stripe', type: 'api', status: 'disconnected', color: 'bg-blue-600', initials: 'ST' },
  { id: '5', name: 'Salesforce', type: 'api', status: 'disconnected', color: 'bg-blue-400', initials: 'SF' },
  { id: '6', name: 'QuickBooks', type: 'api', status: 'disconnected', color: 'bg-green-600', initials: 'QB' },
  { id: '7', name: 'Microsoft Dynamics', type: 'api', status: 'disconnected', color: 'bg-blue-700', initials: 'MD' },
  { id: '8', name: 'Slack', type: 'webhook', status: 'disconnected', color: 'bg-pink-500', initials: 'SL' }
];

const initialSyncLogs: SyncLog[] = [
  {
    id: '1',
    timestamp: '2024-01-15 14:30:22',
    integrationName: 'SAP ERP',
    syncType: 'inbound',
    status: 'success',
    recordsProcessed: 1523,
    duration: '2m 15s'
  },
  {
    id: '2',
    timestamp: '2024-01-15 14:15:10',
    integrationName: 'Stripe',
    syncType: 'outbound',
    status: 'success',
    recordsProcessed: 342,
    duration: '45s'
  },
  {
    id: '3',
    timestamp: '2024-01-15 13:45:33',
    integrationName: 'Salesforce',
    syncType: 'inbound',
    status: 'failed',
    recordsProcessed: 0,
    duration: '12s'
  },
  {
    id: '4',
    timestamp: '2024-01-15 13:30:18',
    integrationName: 'NetSuite',
    syncType: 'inbound',
    status: 'in_progress',
    recordsProcessed: 856,
    duration: '1m 30s'
  },
  {
    id: '5',
    timestamp: '2024-01-15 13:00:05',
    integrationName: 'Shopify',
    syncType: 'outbound',
    status: 'success',
    recordsProcessed: 234,
    duration: '38s'
  },
  {
    id: '6',
    timestamp: '2024-01-15 12:30:42',
    integrationName: 'QuickBooks',
    syncType: 'inbound',
    status: 'success',
    recordsProcessed: 678,
    duration: '1m 8s'
  }
];

export default function IntegrationsPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'integrations' | 'history'>('integrations');
  const [integrations, setIntegrations] = useState<Integration[]>(initialIntegrations);
  const [syncLogs] = useState<SyncLog[]>(initialSyncLogs);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [integrationFilter, setIntegrationFilter] = useState<string>('all');

  const [configData, setConfigData] = useState<IntegrationConfig>({
    name: '',
    endpoint: '',
    authMethod: 'api_key',
    credentials: '',
    syncFrequency: 'daily',
    enabled: true
  });

  if (profile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need administrator privileges to access this page.</p>
        </div>
      </div>
    );
  }

  const connectedCount = integrations.filter(i => i.status === 'connected').length;
  const failedSyncs = syncLogs.filter(log => log.status === 'failed').length;
  const avgDuration = '1m 23s';

  const handleToggleConnection = (id: string) => {
    setIntegrations(prev => prev.map(integration => {
      if (integration.id === id) {
        const newStatus = integration.status === 'connected' ? 'disconnected' : 'connected';
        if (newStatus === 'connected') {
          toast.success(`${integration.name} connected successfully`);
        } else {
          toast(`${integration.name} disconnected successfully`);
        }
        return { ...integration, status: newStatus };
      }
      return integration;
    }));
  };

  const handleConfigure = (integration: Integration) => {
    setSelectedIntegration(integration);
    setConfigData({
      name: integration.name,
      endpoint: '',
      authMethod: 'api_key',
      credentials: '',
      syncFrequency: 'daily',
      enabled: integration.status === 'connected'
    });
    setShowConfigModal(true);
  };

  const handleTestConnection = () => {
    toast( 'Testing connection...');
    setTimeout(() => {
      toast.success( 'Connection test successful!');
    }, 1500);
  };

  const handleSaveConfig = () => {
    if (!configData.name || !configData.endpoint) {
      toast.error( 'Please fill in all required fields');
      return;
    }

    toast.success( `Configuration saved for ${configData.name}`);
    setShowConfigModal(false);
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'api': return 'bg-blue-100 text-blue-700';
      case 'webhook': return 'bg-purple-100 text-purple-700';
      case 'ftp': return 'bg-orange-100 text-orange-700';
      case 'database': return 'bg-green-100 text-green-700';
      case 'manual': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Success
        </span>;
      case 'failed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Failed
        </span>;
      case 'in_progress':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
          In Progress
        </span>;
      default:
        return null;
    }
  };

  const filteredSyncLogs = syncLogs.filter(log => {
    const matchesIntegration = integrationFilter === 'all' || log.integrationName === integrationFilter;
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesIntegration && matchesStatus;
  });

  const filteredIntegrations = integrations.filter(integration =>
    integration.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Plug className="w-8 h-8 text-blue-600" />
            Integrations
          </h1>
          <p className="mt-2 text-gray-600">
            Manage third-party integrations and data synchronization
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Integrations</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{integrations.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Plug className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Connections</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{connectedCount}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Failed Syncs (24h)</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{failedSyncs}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Sync Duration</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{avgDuration}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('integrations')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'integrations'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Plug className="w-4 h-4" />
                  Integrations
                </div>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Sync History
                </div>
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'integrations' ? (
              <>
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search integrations..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {filteredIntegrations.map((integration) => (
                    <div
                      key={integration.id}
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 ${integration.color} rounded-lg flex items-center justify-center text-white font-bold text-lg`}>
                          {integration.initials}
                        </div>
                        <button
                          onClick={() => handleToggleConnection(integration.id)}
                          className={`p-1 rounded-full ${
                            integration.status === 'connected'
                              ? 'text-green-500 hover:bg-green-50'
                              : 'text-gray-400 hover:bg-gray-50'
                          }`}
                          title={integration.status === 'connected' ? 'Connected' : 'Disconnected'}
                        >
                          {integration.status === 'connected' ? (
                            <CheckCircle className="w-6 h-6" />
                          ) : (
                            <XCircle className="w-6 h-6" />
                          )}
                        </button>
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {integration.name}
                      </h3>

                      <div className="mb-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(integration.type)}`}>
                          {integration.type.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${
                          integration.status === 'connected' ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          {integration.status === 'connected' ? 'Connected' : 'Disconnected'}
                        </span>
                        <button
                          onClick={() => handleConfigure(integration)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          <Settings className="w-4 h-4" />
                          Configure
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="mb-6 flex gap-4">
                  <select
                    value={integrationFilter}
                    onChange={(e) => setIntegrationFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Integrations</option>
                    {integrations.map(integration => (
                      <option key={integration.id} value={integration.name}>
                        {integration.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Statuses</option>
                    <option value="success">Success</option>
                    <option value="failed">Failed</option>
                    <option value="in_progress">In Progress</option>
                  </select>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Timestamp
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Integration
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sync Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Records
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Duration
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredSyncLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.timestamp}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {log.integrationName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              {log.syncType === 'inbound' ? (
                                <ArrowDownRight className="w-4 h-4 text-blue-600" />
                              ) : (
                                <ArrowUpRight className="w-4 h-4 text-green-600" />
                              )}
                              <span className="capitalize">{log.syncType}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(log.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.recordsProcessed.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {log.duration}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showConfigModal && selectedIntegration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Configure {selectedIntegration.name}
              </h2>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Integration Name
                </label>
                <input
                  type="text"
                  value={configData.name}
                  onChange={(e) => setConfigData({ ...configData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter integration name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Endpoint / URL
                </label>
                <input
                  type="text"
                  value={configData.endpoint}
                  onChange={(e) => setConfigData({ ...configData, endpoint: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://api.example.com/v1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Authentication Method
                </label>
                <select
                  value={configData.authMethod}
                  onChange={(e) => setConfigData({ ...configData, authMethod: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="api_key">API Key</option>
                  <option value="oauth">OAuth 2.0</option>
                  <option value="basic">Basic Auth</option>
                  <option value="none">None</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Credentials
                </label>
                <input
                  type="password"
                  value={configData.credentials}
                  onChange={(e) => setConfigData({ ...configData, credentials: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter API key or credentials"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sync Frequency
                </label>
                <select
                  value={configData.syncFrequency}
                  onChange={(e) => setConfigData({ ...configData, syncFrequency: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="realtime">Realtime</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="manual">Manual</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Enable Integration</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Toggle to enable or disable this integration
                  </p>
                </div>
                <button
                  onClick={() => setConfigData({ ...configData, enabled: !configData.enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    configData.enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      configData.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleTestConnection}
                  className="flex-1 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Test Connection
                </button>
                <button
                  onClick={handleSaveConfig}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
