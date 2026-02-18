import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  User,
  Calendar,
  Download,
  Eye,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { bulkUploadService } from '../lib/bulkUploadService';
import toast from 'react-hot-toast';

export const BulkUploadHistoryPage: React.FC = () => {
  const { profile } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUpload, setSelectedUpload] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [historyData, statsData] = await Promise.all([
        bulkUploadService.getUploadHistory(100),
        bulkUploadService.getUploadStatistics(),
      ]);
      setHistory(historyData);
      setStatistics(statsData);
    } catch (error: any) {
      toast.error('Failed to load upload history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'success' | 'error' | 'warning' | 'info'; icon: any }> = {
      completed: { variant: 'success', icon: CheckCircle },
      failed: { variant: 'error', icon: XCircle },
      processing: { variant: 'info', icon: Clock },
      partially_completed: { variant: 'warning', icon: AlertCircle },
    };

    const { variant, icon: Icon } = config[status] || config.processing;

    return (
      <Badge variant={variant}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const formatTableName = (name: string) => {
    return name
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const isAdmin =
    profile?.role === 'admin' || profile?.role === 'ceo' || profile?.role === 'group_ceo';

  if (!isAdmin) {
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
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Upload className="w-8 h-8 text-blue-600" />
            Bulk Upload History
          </h1>
          <p className="text-gray-600 mt-1">View and monitor all bulk data uploads</p>
        </div>
      </div>

      {loading ? (
        <Card className="p-12 text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3 animate-spin" />
          <p className="text-gray-600">Loading...</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Uploads</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {statistics.reduce((sum, s) => sum + (s.total_uploads || 0), 0)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Rows</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {statistics.reduce((sum, s) => sum + (s.total_rows_processed || 0), 0)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Successful</p>
                  <p className="text-3xl font-bold text-green-600">
                    {statistics.reduce((sum, s) => sum + (s.total_successful || 0), 0)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Failed</p>
                  <p className="text-3xl font-bold text-red-600">
                    {statistics.reduce((sum, s) => sum + (s.total_failed || 0), 0)}
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      File Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Table
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Uploaded By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Rows
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No upload history yet</p>
                      </td>
                    </tr>
                  ) : (
                    history.map((upload) => (
                      <tr key={upload.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {upload.file_name}
                            </span>
                          </div>
                          {upload.file_size && (
                            <p className="text-xs text-gray-500 mt-1">
                              {(upload.file_size / 1024).toFixed(2)} KB
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">
                            {formatTableName(upload.table_name)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">
                              {upload.profiles?.full_name || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <p className="text-gray-900">{upload.total_rows || 0} total</p>
                            <p className="text-green-600">{upload.successful_rows || 0} success</p>
                            {upload.failed_rows > 0 && (
                              <p className="text-red-600">{upload.failed_rows} failed</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(upload.status)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-900">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {format(new Date(upload.created_at), 'MMM dd, yyyy HH:mm')}
                          </div>
                          {upload.processing_time_ms && (
                            <p className="text-xs text-gray-500 mt-1">
                              {(upload.processing_time_ms / 1000).toFixed(2)}s
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUpload(upload)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {selectedUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Upload Details</h2>
                <button
                  onClick={() => setSelectedUpload(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">File Name</p>
                  <p className="font-medium text-gray-900">{selectedUpload.file_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Table</p>
                  <p className="font-medium text-gray-900">
                    {formatTableName(selectedUpload.table_name)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  {getStatusBadge(selectedUpload.status)}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Processing Time</p>
                  <p className="font-medium text-gray-900">
                    {selectedUpload.processing_time_ms
                      ? `${(selectedUpload.processing_time_ms / 1000).toFixed(2)}s`
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {selectedUpload.error_details && selectedUpload.error_details.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Errors</h3>
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left">Row</th>
                          <th className="px-4 py-2 text-left">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedUpload.error_details.map((err: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-4 py-2">{err.row}</td>
                            <td className="px-4 py-2 text-red-600">{err.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <Button onClick={() => setSelectedUpload(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
