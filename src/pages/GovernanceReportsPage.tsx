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
  BarChart3,
  TrendingUp,
  Star,
  Search,
  Tag,
  Layout,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { ReportTemplateModal } from '../components/governance/ReportTemplateModal';
import { ReportScheduleModal } from '../components/governance/ReportScheduleModal';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'templates' | 'generations' | 'deliveries' | 'approvals'>('dashboard');
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [generations, setGenerations] = useState<ReportGeneration[]>([]);
  const [deliveries, setDeliveries] = useState<ReportDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [popularReports, setPopularReports] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    loadFavorites();
  }, [profile?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'dashboard':
          await loadDashboard();
          break;
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

  const loadDashboard = async () => {
    const [metricsRes, popularRes] = await Promise.all([
      supabase.from('report_dashboard_metrics').select('*').single(),
      supabase.rpc('get_popular_reports', { p_limit: 10, p_days: 30 }),
    ]);

    if (metricsRes.data) setDashboardMetrics(metricsRes.data);
    if (popularRes.data) setPopularReports(popularRes.data);
  };

  const loadFavorites = async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('report_favorites')
      .select('template_id')
      .eq('user_id', profile.id);
    if (data) setFavorites(data.map((f) => f.template_id));
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

  const toggleFavorite = async (templateId: string) => {
    if (!profile?.id) return;

    try {
      if (favorites.includes(templateId)) {
        await supabase
          .from('report_favorites')
          .delete()
          .eq('user_id', profile.id)
          .eq('template_id', templateId);
        setFavorites(favorites.filter((f) => f !== templateId));
        toast.success('Removed from favorites');
      } else {
        await supabase
          .from('report_favorites')
          .insert([{ user_id: profile.id, template_id: templateId }]);
        setFavorites([...favorites, templateId]);
        toast.success('Added to favorites');
      }
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  const logAnalytics = async (templateId: string, eventType: string) => {
    await supabase.rpc('log_report_analytics', {
      p_template_id: templateId,
      p_generation_id: null,
      p_event_type: eventType,
    });
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'ceo' || profile?.role === 'group_ceo';

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.report_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {[
          { key: 'dashboard', label: 'Dashboard', icon: Layout },
          { key: 'templates', label: 'Templates', icon: FileText },
          { key: 'generations', label: 'Generated Reports', icon: Calendar },
          { key: 'deliveries', label: 'Deliveries', icon: Mail },
          { key: 'approvals', label: 'Approvals', icon: CheckCircle },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
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
          {activeTab === 'dashboard' && dashboardMetrics && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Templates</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {dashboardMetrics.total_templates || 0}
                      </p>
                      <p className="text-sm text-green-600 mt-1">
                        {dashboardMetrics.active_templates || 0} active
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <FileText className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Reports Generated</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {dashboardMetrics.total_generations || 0}
                      </p>
                      <p className="text-sm text-green-600 mt-1">
                        {dashboardMetrics.successful_generations || 0} successful
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <BarChart3 className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Deliveries</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {dashboardMetrics.total_deliveries || 0}
                      </p>
                      <p className="text-sm text-green-600 mt-1">
                        {dashboardMetrics.successful_deliveries || 0} sent
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Mail className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Downloads</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {dashboardMetrics.total_downloads || 0}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Avg: {parseFloat(dashboardMetrics.avg_downloads_per_report || 0).toFixed(1)}
                      </p>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <Download className="w-8 h-8 text-orange-600" />
                    </div>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Most Popular Reports (Last 30 Days)
                  </h3>
                  <div className="space-y-3">
                    {popularReports.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No data available</p>
                    ) : (
                      popularReports.slice(0, 5).map((report, index) => (
                        <div
                          key={report.template_id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-blue-600 font-semibold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{report.template_name}</p>
                              <p className="text-sm text-gray-500">{report.report_type}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {report.view_count} views
                            </p>
                            <p className="text-xs text-gray-500">
                              {report.download_count} downloads
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-600" />
                    Delivery Success Rate
                  </h3>
                  {dashboardMetrics.total_deliveries > 0 ? (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={[
                              {
                                name: 'Successful',
                                value: dashboardMetrics.successful_deliveries || 0,
                              },
                              {
                                name: 'Failed',
                                value:
                                  (dashboardMetrics.total_deliveries || 0) -
                                  (dashboardMetrics.successful_deliveries || 0),
                              },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            <Cell fill="#10B981" />
                            <Cell fill="#EF4444" />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">
                            {(
                              ((dashboardMetrics.successful_deliveries || 0) /
                                (dashboardMetrics.total_deliveries || 1)) *
                              100
                            ).toFixed(1)}
                            %
                          </p>
                          <p className="text-sm text-gray-600">Success Rate</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">
                            {(
                              ((dashboardMetrics.opened_reports || 0) /
                                (dashboardMetrics.total_deliveries || 1)) *
                              100
                            ).toFixed(1)}
                            %
                          </p>
                          <p className="text-sm text-gray-600">Open Rate</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-12">No delivery data yet</p>
                  )}
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search templates..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                <Card key={template.id} className="p-6 hover:shadow-lg transition-shadow relative">
                  <button
                    onClick={() => toggleFavorite(template.id)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-yellow-500 transition-colors"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        favorites.includes(template.id)
                          ? 'fill-yellow-500 text-yellow-500'
                          : ''
                      }`}
                    />
                  </button>

                  <div className="flex items-start gap-3 mb-4 pr-8">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-500">{template.report_type}</p>
                      {template.is_active && (
                        <Badge variant="success" className="mt-1">Active</Badge>
                      )}
                    </div>
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedTemplate(template.id);
                        setShowTemplateModal(true);
                      }}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedTemplate(template.id);
                        setShowScheduleModal(true);
                      }}
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Schedule
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
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

      <ReportTemplateModal
        isOpen={showTemplateModal}
        onClose={() => {
          setShowTemplateModal(false);
          setSelectedTemplate(null);
        }}
        onSuccess={() => {
          loadData();
        }}
        template={selectedTemplate ? templates.find((t) => t.id === selectedTemplate) : undefined}
      />

      <ReportScheduleModal
        isOpen={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          setSelectedTemplate(null);
        }}
        onSuccess={() => {
          loadData();
        }}
        templateId={selectedTemplate || undefined}
      />
    </div>
  );
};
