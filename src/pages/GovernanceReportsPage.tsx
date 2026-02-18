import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  FileText,
  Plus,
  Calendar,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  AlertCircle,
  Settings,
  Users,
  Mail,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  report_type: string;
  format: string;
  is_active: boolean;
  created_at: string;
}

interface ReportGeneration {
  id: string;
  template_id: string;
  report_period_start: string;
  report_period_end: string;
  status: string;
  generated_at: string;
  file_size?: number;
  report_templates: ReportTemplate;
}

interface ReportDelivery {
  id: string;
  generation_id: string;
  recipient_email: string;
  delivery_status: string;
  sent_at?: string;
  opened_at?: string;
  download_count: number;
  report_generations: ReportGeneration;
}

export const GovernanceReportsPage: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'templates' | 'generations' | 'deliveries' | 'approvals'>('templates');
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [generations, setGenerations] = useState<ReportGeneration[]>([]);
  const [deliveries, setDeliveries] = useState<ReportDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'templates':
          await loadTemplates();
          break;
        case 'generations':
          await loadGenerations();
          break;
        case 'deliveries':
          await loadDeliveries();
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setTemplates(data || []);
  };

  const loadGenerations = async () => {
    const { data, error } = await supabase
      .from('report_generations')
      .select('*, report_templates(*)')
      .order('generated_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    setGenerations(data || []);
  };

  const loadDeliveries = async () => {
    const { data, error } = await supabase
      .from('report_deliveries')
      .select('*, report_generations(*, report_templates(*))')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    setDeliveries(data || []);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'success' | 'error' | 'warning' | 'info'; icon: any }> = {
      ready: { variant: 'success', icon: CheckCircle },
      generating: { variant: 'info', icon: Clock },
      failed: { variant: 'error', icon: XCircle },
      delivered: { variant: 'success', icon: Mail },
      sent: { variant: 'success', icon: CheckCircle },
      pending: { variant: 'warning', icon: Clock },
      opened: { variant: 'success', icon: Eye },
    };

    const config = statusConfig[status] || { variant: 'info' as const, icon: AlertCircle };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'ceo';

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
            <Shield className="w-8 h-8 text-blue-600" />
            Governance Reporting System
          </h1>
          <p className="text-gray-600 mt-1">
            Automated, secure, and compliant report distribution
          </p>
        </div>

        {activeTab === 'templates' && (
          <Button onClick={() => setShowTemplateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        )}
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: 'templates', label: 'Templates', icon: FileText },
          { key: 'generations', label: 'Generated Reports', icon: Calendar },
          { key: 'deliveries', label: 'Deliveries', icon: Mail },
          { key: 'approvals', label: 'Approvals', icon: CheckCircle },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <Card className="p-12 text-center">
          <div className="flex items-center justify-center gap-3">
            <Clock className="w-6 h-6 animate-spin text-blue-600" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </Card>
      ) : (
        <>
          {activeTab === 'templates' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <Card key={template.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                        <p className="text-sm text-gray-500">{template.report_type}</p>
                      </div>
                    </div>
                    {template.is_active && (
                      <Badge variant="success">Active</Badge>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {template.description || 'No description'}
                  </p>

                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <span className="px-2 py-1 bg-gray-100 rounded">
                      {template.format.toUpperCase()}
                    </span>
                    <span>•</span>
                    <span>{format(new Date(template.created_at), 'MMM dd, yyyy')}</span>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Settings className="w-4 h-4 mr-1" />
                      Configure
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Users className="w-4 h-4 mr-1" />
                      Distribution
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {activeTab === 'generations' && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Report
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Size
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Generated
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {generations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">No reports generated yet</p>
                        </td>
                      </tr>
                    ) : (
                      generations.map((gen) => (
                        <tr key={gen.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-gray-900">
                                {gen.report_templates.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {gen.report_templates.report_type}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {format(new Date(gen.report_period_start), 'MMM dd')} -{' '}
                            {format(new Date(gen.report_period_end), 'MMM dd, yyyy')}
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(gen.status)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {formatFileSize(gen.file_size)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {format(new Date(gen.generated_at), 'MMM dd, yyyy HH:mm')}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {gen.status === 'ready' && (
                                <Button variant="outline" size="sm">
                                  <Download className="w-4 h-4" />
                                </Button>
                              )}
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeTab === 'deliveries' && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Report
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Recipient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Sent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Downloads
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Opened
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deliveries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">No deliveries yet</p>
                        </td>
                      </tr>
                    ) : (
                      deliveries.map((delivery) => (
                        <tr key={delivery.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">
                              {delivery.report_generations.report_templates.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {delivery.recipient_email}
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(delivery.delivery_status)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {delivery.sent_at
                              ? format(new Date(delivery.sent_at), 'MMM dd, HH:mm')
                              : '-'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Download className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900">
                                {delivery.download_count}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {delivery.opened_at
                              ? format(new Date(delivery.opened_at), 'MMM dd, HH:mm')
                              : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeTab === 'approvals' && (
            <Card className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Approval Workflow
              </h3>
              <p className="text-gray-600 mb-6">
                Review and approve pending report distributions
              </p>
              <Button>
                <Filter className="w-4 h-4 mr-2" />
                View Pending Approvals
              </Button>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
