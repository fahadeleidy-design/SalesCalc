import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Mail, CheckCircle, XCircle, Clock, AlertCircle, Search, Filter, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '../components/ui/Input';

interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  type: string;
  quotation_number: string | null;
  sent_at: string;
  status: string;
  error_message: string | null;
  retry_count: number;
  metadata: any;
  sent_by: string | null;
  created_at: string;
}

export const EmailLogsPage: React.FC = () => {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);

  useEffect(() => {
    loadEmailLogs();
  }, []);

  const loadEmailLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error loading email logs:', error);
        throw error;
      }

      setLogs(data || []);
    } catch (error: any) {
      console.error('Error loading email logs:', error);
      // Show a user-friendly error message
      const errorMessage = error?.message || 'Failed to load email logs';
      console.log('Email logs error details:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'test_mode':
        return <Clock className="w-5 h-5 text-amber-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
      sent: 'success',
      failed: 'error',
      test_mode: 'warning',
    };

    return (
      <Badge variant={variants[status] || 'info'}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = searchTerm
      ? log.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.quotation_number?.toLowerCase().includes(searchTerm.toLowerCase())
      : true;

    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (profile?.role !== 'admin') {
    return (
      <div className="p-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="w-6 h-6" />
            <p>You do not have permission to access this page.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Logs</h1>
          <p className="text-gray-600 mt-1">View all email notifications sent by the system</p>
        </div>
        <button
          onClick={loadEmailLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search by recipient, subject, or quotation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="test_mode">Test Mode</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Email Logs Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recipient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quotation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sent At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Loading email logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Mail className="w-12 h-12 text-gray-300" />
                      <p className="text-gray-500 font-medium">
                        {searchTerm || statusFilter !== 'all'
                          ? 'No email logs match your filters'
                          : 'No email logs found'}
                      </p>
                      {(searchTerm || statusFilter !== 'all') && (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('all');
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.status)}
                        {getStatusBadge(log.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{log.recipient}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">{log.subject}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {log.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {log.quotation_number || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {format(new Date(log.sent_at), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Email Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Email Details</h2>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedLog.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Type</label>
                    <div className="mt-1 text-sm text-gray-900">{selectedLog.type}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Recipient</label>
                    <div className="mt-1 text-sm text-gray-900">{selectedLog.recipient}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Sent At</label>
                    <div className="mt-1 text-sm text-gray-900">
                      {format(new Date(selectedLog.sent_at), 'PPpp')}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Quotation Number</label>
                    <div className="mt-1 text-sm text-gray-900">
                      {selectedLog.quotation_number || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Retry Count</label>
                    <div className="mt-1 text-sm text-gray-900">{selectedLog.retry_count}</div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Subject</label>
                  <div className="mt-1 text-sm text-gray-900 p-3 bg-gray-50 rounded-lg">
                    {selectedLog.subject}
                  </div>
                </div>

                {selectedLog.error_message && (
                  <div>
                    <label className="text-sm font-medium text-red-700">Error Message</label>
                    <div className="mt-1 text-sm text-red-900 p-3 bg-red-50 rounded-lg">
                      {selectedLog.error_message}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700">Email Body (HTML)</label>
                  <div className="mt-1 border border-gray-300 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 p-3 border-b border-gray-300">
                      <span className="text-xs text-gray-600">Preview:</span>
                    </div>
                    <div
                      className="p-4 max-h-96 overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: selectedLog.body }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
