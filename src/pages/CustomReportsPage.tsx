import { useState, useEffect, useCallback } from 'react';
import {
    BarChart3,
    Plus,
    Search,
    Star,
    StarOff,
    MoreVertical,
    Copy,
    Trash2,
    Edit,
    Play,
    FileSpreadsheet,
    X,
    CheckCircle,
    AlertCircle,
    Download,
    Target,
    UserPlus,
    DollarSign,
    ShoppingCart,
    Database,
} from 'lucide-react';
import {
    getReports,
    createReport,
    deleteReport,
    duplicateReport,
    toggleFavorite,
    executeReport,
    updateReport,
    exportToCSV,
    CustomReport,
    ReportConfig,
    REPORT_TEMPLATES,
    AVAILABLE_DIMENSIONS,
    AVAILABLE_METRICS,
    DimensionType,
    MetricType,
    ChartType,
    TimePeriod,
    ReportResult,
    DataSourceType,
} from '../lib/reportBuilderService';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ScatterChart,
    Scatter,
    ZAxis,
    Treemap,
    RadialBarChart,
    RadialBar,
    FunnelChart,
    Funnel,
    LabelList,
    ComposedChart,
} from 'recharts';

// =============================================================================
// Constants
// =============================================================================

const CHART_COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

const TIME_PERIOD_OPTIONS: { value: TimePeriod; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'this_quarter', label: 'This Quarter' },
    { value: 'this_year', label: 'This Year' },
    { value: 'last_30_days', label: 'Last 30 Days' },
    { value: 'last_90_days', label: 'Last 90 Days' },
];

const DATA_SOURCE_OPTIONS: { value: DataSourceType; label: string; icon: any }[] = [
    { value: 'quotations', label: 'Quotations', icon: FileSpreadsheet },
    { value: 'leads', label: 'Leads', icon: UserPlus },
    { value: 'opportunities', label: 'Opportunities', icon: Target },
    { value: 'collections', label: 'Collections', icon: DollarSign },
    { value: 'purchase_orders', label: 'Purchase Orders', icon: ShoppingCart },
];

const METRICS_BY_SOURCE: Record<DataSourceType, MetricType[]> = {
    quotations: ['total_revenue', 'avg_deal_size', 'total_cost', 'total_profit', 'profit_margin_pct', 'quotation_count', 'win_rate', 'total_commission', 'avg_margin', 'tax_amount'],
    leads: ['quotation_count', 'avg_lead_score', 'conversion_rate'],
    opportunities: ['pipeline_value', 'avg_deal_size', 'win_rate'],
    collections: ['collection_amount', 'tax_amount'],
    purchase_orders: ['po_total', 'tax_amount'],
};

const DIMENSIONS_BY_SOURCE: Record<DataSourceType, DimensionType[]> = {
    quotations: ['sales_rep', 'customer', 'product', 'product_category', 'time_period', 'status', 'manager', 'sector'],
    leads: ['sales_rep', 'time_period', 'status', 'source'],
    opportunities: ['sales_rep', 'customer', 'time_period', 'status', 'stage'],
    collections: ['customer', 'time_period', 'status', 'payment_method'],
    purchase_orders: ['supplier', 'time_period', 'status'],
};

// =============================================================================
// Main Component
// =============================================================================

export default function CustomReportsPage() {
    const [reports, setReports] = useState<CustomReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'my_reports' | 'templates'>('my_reports');
    const [searchQuery, setSearchQuery] = useState('');
    const [showBuilder, setShowBuilder] = useState(false);
    const [editingReport, setEditingReport] = useState<CustomReport | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<typeof REPORT_TEMPLATES[0] | null>(null);

    const loadReports = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getReports();
            setReports(data);
        } catch (error) {
            console.error('Error loading reports:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch reports on mount
    useEffect(() => {
        loadReports();
    }, [loadReports]);

    const handleCreateNew = () => {
        setEditingReport(null);
        setSelectedTemplate(null);
        setShowBuilder(true);
    };

    const handleEditReport = (report: CustomReport) => {
        setEditingReport(report);
        setShowBuilder(true);
    };

    const handleUseTemplate = (template: typeof REPORT_TEMPLATES[0]) => {
        setSelectedTemplate(template);
        setEditingReport(null);
        setShowBuilder(true);
    };

    const handleDeleteReport = async (id: string) => {
        if (confirm('Are you sure you want to delete this report?')) {
            try {
                await deleteReport(id);
                await loadReports();
            } catch (error) {
                console.error('Error deleting report:', error);
            }
        }
    };

    const handleDuplicateReport = async (id: string) => {
        try {
            await duplicateReport(id);
            await loadReports();
        } catch (error) {
            console.error('Error duplicating report:', error);
        }
    };

    const handleToggleFavorite = async (id: string, current: boolean) => {
        try {
            await toggleFavorite(id, !current);
            await loadReports();
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    };

    const handleSaveReport = async () => {
        await loadReports();
        setShowBuilder(false);
        setEditingReport(null);
        setSelectedTemplate(null);
    };

    const filteredReports = reports.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (showBuilder) {
        return (
            <ReportBuilder
                initialReport={editingReport}
                template={selectedTemplate}
                onSave={handleSaveReport}
                onCancel={() => {
                    setShowBuilder(false);
                    setEditingReport(null);
                    setSelectedTemplate(null);
                }}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <BarChart3 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Custom Reports</h1>
                        <p className="text-slate-600">Build and analyze financial reports</p>
                    </div>
                </div>
                <button
                    onClick={handleCreateNew}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="h-5 w-5" />
                    Create Report
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('my_reports')}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'my_reports'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                >
                    My Reports ({reports.length})
                </button>
                <button
                    onClick={() => setActiveTab('templates')}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'templates'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                >
                    Templates
                </button>
            </div>

            {activeTab === 'my_reports' ? (
                <>
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search reports..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Reports List */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white rounded-lg p-6 border border-slate-200 animate-pulse">
                                    <div className="h-6 bg-slate-200 rounded w-3/4 mb-3" />
                                    <div className="h-4 bg-slate-100 rounded w-full mb-2" />
                                    <div className="h-4 bg-slate-100 rounded w-2/3" />
                                </div>
                            ))}
                        </div>
                    ) : filteredReports.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
                            <FileSpreadsheet className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                            <h3 className="text-lg font-medium text-slate-900 mb-1">No reports yet</h3>
                            <p className="text-slate-600 mb-4">Create your first custom report to get started</p>
                            <button
                                onClick={handleCreateNew}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <Plus className="h-5 w-5" />
                                Create Report
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredReports.map((report) => (
                                <ReportCard
                                    key={report.id}
                                    report={report}
                                    onEdit={() => handleEditReport(report)}
                                    onDelete={() => handleDeleteReport(report.id)}
                                    onDuplicate={() => handleDuplicateReport(report.id)}
                                    onToggleFavorite={() => handleToggleFavorite(report.id, report.is_favorite)}
                                />
                            ))}
                        </div>
                    )}
                </>
            ) : (
                /* Templates */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {REPORT_TEMPLATES.map((template, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-lg p-6 border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <BarChart3 className="h-5 w-5 text-blue-600" />
                                </div>
                            </div>
                            <h3 className="font-semibold text-slate-900 mb-1">{template.name}</h3>
                            <p className="text-sm text-slate-600 mb-4">{template.description}</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleUseTemplate(template)}
                                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Use Template
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// Report Card Component
// =============================================================================

function ReportCard({
    report,
    onEdit,
    onDelete,
    onDuplicate,
    onToggleFavorite
}: {
    report: CustomReport;
    onEdit: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onToggleFavorite: () => void;
}) {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div className="bg-white rounded-lg p-6 border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3">
                <button
                    onClick={onToggleFavorite}
                    className="p-1 hover:bg-slate-100 rounded transition-colors"
                >
                    {report.is_favorite ? (
                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    ) : (
                        <StarOff className="h-5 w-5 text-slate-400" />
                    )}
                </button>
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-1 hover:bg-slate-100 rounded transition-colors"
                    >
                        <MoreVertical className="h-5 w-5 text-slate-400" />
                    </button>
                    {showMenu && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowMenu(false)}
                            />
                            <div className="absolute right-0 top-8 z-20 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1">
                                <button
                                    onClick={() => { onEdit(); setShowMenu(false); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                >
                                    <Edit className="h-4 w-4" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => { onDuplicate(); setShowMenu(false); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                >
                                    <Copy className="h-4 w-4" />
                                    Duplicate
                                </button>
                                <button
                                    onClick={() => { onDelete(); setShowMenu(false); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">{report.name}</h3>
            <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                {report.description || 'No description'}
            </p>
            <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Last run: {report.last_run_at
                    ? new Date(report.last_run_at).toLocaleDateString()
                    : 'Never'
                }</span>
                <span>{report.run_count} runs</span>
            </div>
            <button
                onClick={onEdit}
                className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
                <Play className="h-4 w-4" />
                Open Report
            </button>
        </div>
    );
}

// =============================================================================
// Report Builder Component
// =============================================================================

function ReportBuilder({
    initialReport,
    template,
    onSave,
    onCancel,
}: {
    initialReport?: CustomReport | null;
    template?: typeof REPORT_TEMPLATES[0] | null;
    onSave: () => void;
    onCancel: () => void;
}) {
    // State
    const [name, setName] = useState(initialReport?.name || template?.name || '');
    const [description, setDescription] = useState(initialReport?.description || template?.description || '');
    const [dataSource, setDataSource] = useState<DataSourceType>(
        initialReport?.report_config?.dataSource ||
        template?.config?.dataSource ||
        'quotations'
    );
    const [selectedDimensions, setSelectedDimensions] = useState<DimensionType[]>(
        initialReport?.report_config?.dimensions?.map(d => d.type) ||
        template?.config?.dimensions?.map(d => d.type) ||
        ['sales_rep']
    );
    const [selectedMetrics, setSelectedMetrics] = useState<MetricType[]>(
        initialReport?.report_config?.metrics?.map(m => m.type) ||
        template?.config?.metrics?.map(m => m.type) ||
        ['total_revenue']
    );
    const [chartType, setChartType] = useState<ChartType>(
        initialReport?.report_config?.visualization?.type ||
        template?.config?.visualization?.type ||
        'bar'
    );
    const [timePeriod, setTimePeriod] = useState<TimePeriod>(
        initialReport?.report_config?.dateRange?.preset ||
        template?.config?.dateRange?.preset ||
        'this_month'
    );
    const [results, setResults] = useState<ReportResult | null>(null);
    const [executing, setExecuting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Build config from state
    const buildConfig = (): ReportConfig => ({
        dataSource,
        dimensions: selectedDimensions.map(type => ({
            type,
            label: AVAILABLE_DIMENSIONS[type].label,
        })),
        metrics: selectedMetrics.map(type => ({
            type,
            label: AVAILABLE_METRICS[type].label,
            format: AVAILABLE_METRICS[type].format,
        })),
        filters: [],
        visualization: {
            type: chartType,
            showGrid: true,
            showChart: true,
        },
        dateRange: {
            preset: timePeriod,
        },
    });

    // Run report
    const handleRunReport = async () => {
        setExecuting(true);
        setError(null);
        try {
            const config = buildConfig();
            const result = await executeReport(config);
            setResults(result);
        } catch (err: any) {
            setError(`Failed to execute report: ${err.message || 'Please try again.'}`);
            console.error('📊 Report Execution Failed:', err);
        } finally {
            setExecuting(false);
        }
    };

    // Save report
    const handleSave = async () => {
        if (!name.trim()) {
            setError('Report name is required');
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const config = buildConfig();

            if (initialReport) {
                // Update existing report
                await updateReport(initialReport.id, {
                    name,
                    description,
                    report_config: config,
                });
            } else {
                // Create new report
                await createReport({
                    name,
                    description,
                    report_config: config,
                });
            }
            onSave();
        } catch (err: any) {
            setError(`Failed to save report: ${err.message || 'Please try again.'}`);
            console.error('💾 Report Save Failed:', err);
        } finally {
            setSaving(false);
        }
    };

    // Toggle dimension
    const toggleDimension = (dim: DimensionType) => {
        if (selectedDimensions.includes(dim)) {
            setSelectedDimensions(selectedDimensions.filter(d => d !== dim));
        } else {
            setSelectedDimensions([...selectedDimensions, dim]);
        }
    };

    // Toggle metric
    const toggleMetric = (metric: MetricType) => {
        if (selectedMetrics.includes(metric)) {
            setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
        } else {
            setSelectedMetrics([...selectedMetrics, metric]);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            {initialReport ? 'Edit Report' : 'Create Report'}
                        </h1>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleRunReport}
                        disabled={executing || selectedDimensions.length === 0 || selectedMetrics.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors"
                    >
                        <Play className="h-5 w-5" />
                        {executing ? 'Running...' : 'Run Report'}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !name.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        <CheckCircle className="h-5 w-5" />
                        {saving ? 'Saving...' : 'Save Report'}
                    </button>
                </div>
            </div>

            {/* Error message */}
            {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                    <AlertCircle className="h-5 w-5" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Configuration Panel */}
                <div className="space-y-6">
                    {/* Data Source */}
                    <div className="bg-white rounded-lg p-6 border border-slate-200">
                        <div className="flex items-center gap-2 mb-4">
                            <Database className="h-5 w-5 text-blue-600" />
                            <h2 className="font-semibold text-slate-900">Data Source</h2>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {DATA_SOURCE_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => {
                                        setDataSource(opt.value);
                                        // Reset metrics/dims that don't belong to the new source
                                        setSelectedDimensions(prev => prev.filter(d => DIMENSIONS_BY_SOURCE[opt.value].includes(d)));
                                        setSelectedMetrics(prev => prev.filter(m => METRICS_BY_SOURCE[opt.value].includes(m)));
                                    }}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${dataSource === opt.value
                                        ? 'border-blue-500 bg-purple-50 text-blue-700 ring-2 ring-blue-500/10'
                                        : 'border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <opt.icon className={`h-5 w-5 ${dataSource === opt.value ? 'text-blue-600' : 'text-slate-400'}`} />
                                    <span className="font-medium">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Report Details */}
                    <div className="bg-white rounded-lg p-6 border border-slate-200">
                        <div className="flex items-center gap-2 mb-4">
                            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                            <h2 className="font-semibold text-slate-900">Report Details</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Name *
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="My Report"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Report description..."
                                    rows={2}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Time Period */}
                    <div className="bg-white rounded-lg p-6 border border-slate-200">
                        <h2 className="font-semibold text-slate-900 mb-4">Time Period</h2>
                        <select
                            value={timePeriod}
                            onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {TIME_PERIOD_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Dimensions */}
                    <div className="bg-white rounded-lg p-6 border border-slate-200">
                        <h2 className="font-semibold text-slate-900 mb-4">
                            Dimensions <span className="text-sm text-slate-500 font-normal">(Group by)</span>
                        </h2>
                        <div className="space-y-2">
                            {DIMENSIONS_BY_SOURCE[dataSource].map(dim => (
                                <label
                                    key={dim}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedDimensions.includes(dim)}
                                        onChange={() => toggleDimension(dim)}
                                        className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-700">
                                        {AVAILABLE_DIMENSIONS[dim].label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Metrics */}
                    <div className="bg-white rounded-lg p-6 border border-slate-200">
                        <h2 className="font-semibold text-slate-900 mb-4">
                            Metrics <span className="text-sm text-slate-500 font-normal">(Measure)</span>
                        </h2>
                        <div className="space-y-2">
                            {METRICS_BY_SOURCE[dataSource].map(metric => (
                                <label
                                    key={metric}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedMetrics.includes(metric)}
                                        onChange={() => toggleMetric(metric)}
                                        className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-700">
                                        {AVAILABLE_METRICS[metric].label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Visualization */}
                    <div className="bg-white rounded-lg p-6 border border-slate-200">
                        <h2 className="font-semibold text-slate-900 mb-4">Visualization</h2>
                        <div className="grid grid-cols-3 gap-2">
                            {([
                                { type: 'bar', label: 'Bar' },
                                { type: 'line', label: 'Line' },
                                { type: 'pie', label: 'Pie' },
                                { type: 'area', label: 'Area' },
                                { type: 'stacked_bar', label: 'Stacked' },
                                { type: 'grid', label: 'Table' },
                                { type: 'heatmap', label: 'Heatmap' },
                                { type: 'radar', label: 'Radar' },
                                { type: 'scatter', label: 'Scatter' },
                                { type: 'funnel', label: 'Funnel' },
                                { type: 'treemap', label: 'Treemap' },
                                { type: 'radial_bar', label: 'Radial' },
                                { type: 'doughnut', label: 'Doughnut' },
                                { type: 'composed', label: 'Combined' },
                            ] as { type: ChartType; label: string }[]).map(({ type, label }) => (
                                <button
                                    key={type}
                                    onClick={() => setChartType(type)}
                                    className={`p-2.5 rounded-lg border text-xs font-medium transition-colors ${chartType === type
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Results Panel */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-lg p-6 border border-slate-200 min-h-[600px]">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-semibold text-slate-900">Results</h2>
                            <div className="flex items-center gap-4">
                                {results && (
                                    <button
                                        onClick={() => exportToCSV(results.data, name || 'report')}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                                    >
                                        <Download className="h-4 w-4" />
                                        Export CSV
                                    </button>
                                )}
                                {results && (
                                    <span className="text-sm text-slate-500">
                                        {results.metadata.rowCount} rows • {results.metadata.executionTimeMs}ms
                                    </span>
                                )}
                            </div>
                        </div>

                        {!results ? (
                            <div className="flex flex-col items-center justify-center h-96 text-center">
                                <BarChart3 className="h-16 w-16 text-slate-300 mb-4" />
                                <h3 className="text-lg font-medium text-slate-600 mb-2">
                                    Select dimensions and metrics
                                </h3>
                                <p className="text-slate-500 mb-4">
                                    Then click "Run Report" to see results
                                </p>
                            </div>
                        ) : results.data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-96 text-center">
                                <AlertCircle className="h-16 w-16 text-slate-300 mb-4" />
                                <h3 className="text-lg font-medium text-slate-600 mb-2">
                                    No data found
                                </h3>
                                <p className="text-slate-500">
                                    Try adjusting your filters or time period
                                </p>
                            </div>
                        ) : (
                            <ReportVisualization
                                data={results.data}
                                chartType={chartType}
                                dimensions={selectedDimensions}
                                metrics={selectedMetrics}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// Report Visualization Component
// =============================================================================

function ReportVisualization({
    data,
    chartType,
    dimensions,
    metrics,
}: {
    data: Record<string, any>[];
    chartType: ChartType;
    dimensions: DimensionType[];
    metrics: MetricType[];
}) {
    const primaryDimension = dimensions[0];
    const labelKey = `${primaryDimension}_label`;

    const formatValue = (value: number, metric: MetricType): string => {
        const format = AVAILABLE_METRICS[metric].format;
        if (format === 'currency') {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'SAR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(value);
        }
        if (format === 'percentage') {
            return `${value.toFixed(1)}%`;
        }
        return new Intl.NumberFormat('en-US').format(Math.round(value));
    };

    const chartData = data.map(row => ({
        name: row[labelKey] || row[primaryDimension] || 'Unknown',
        ...metrics.reduce((acc, metric) => {
            acc[metric] = row[metric] || 0;
            return acc;
        }, {} as Record<string, number>),
    }));

    const maxValue = Math.max(...chartData.flatMap(d => metrics.map(m => d[m] || 0)));

    if (chartType === 'grid') {
        return (
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-200">
                            <th className="text-left py-3 px-4 font-semibold text-slate-700">
                                {AVAILABLE_DIMENSIONS[primaryDimension]?.label || 'Dimension'}
                            </th>
                            {metrics.map(metric => (
                                <th key={metric} className="text-right py-3 px-4 font-semibold text-slate-700">
                                    {AVAILABLE_METRICS[metric].label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, index) => (
                            <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="py-3 px-4 text-slate-900">
                                    {row[labelKey] || row[primaryDimension] || 'Unknown'}
                                </td>
                                {metrics.map(metric => (
                                    <td key={metric} className="text-right py-3 px-4 text-slate-700 font-medium">
                                        {formatValue(row[metric] || 0, metric)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    if (chartType === 'heatmap') {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Low</span>
                    <div className="flex-1 mx-4 h-4 rounded bg-gradient-to-r from-blue-100 via-blue-300 via-blue-500 to-blue-700" />
                    <span>High</span>
                </div>
                <div className="grid gap-2" style={{ gridTemplateColumns: `auto repeat(${metrics.length}, 1fr)` }}>
                    <div className="font-semibold text-slate-700 p-2"></div>
                    {metrics.map(metric => (
                        <div key={metric} className="font-semibold text-slate-700 p-2 text-center text-sm truncate">
                            {AVAILABLE_METRICS[metric].label}
                        </div>
                    ))}
                    {chartData.map((row, rowIndex) => (
                        <>
                            <div key={`label-${rowIndex}`} className="p-2 text-sm text-slate-700 truncate">
                                {row.name}
                            </div>
                            {metrics.map((metric, colIndex) => {
                                const value = row[metric] || 0;
                                const intensity = maxValue > 0 ? value / maxValue : 0;
                                const bgColor = `rgba(59, 130, 246, ${0.1 + intensity * 0.8})`;
                                const textColor = intensity > 0.5 ? 'white' : '#1e293b';
                                return (
                                    <div
                                        key={`cell-${rowIndex}-${colIndex}`}
                                        className="p-3 rounded text-center text-sm font-medium transition-all hover:ring-2 hover:ring-blue-400"
                                        style={{ backgroundColor: bgColor, color: textColor }}
                                        title={`${row.name}: ${formatValue(value, metric)}`}
                                    >
                                        {formatValue(value, metric)}
                                    </div>
                                );
                            })}
                        </>
                    ))}
                </div>
            </div>
        );
    }

    if (chartType === 'radar') {
        return (
            <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={chartData}>
                        <PolarGrid stroke="#E2E8F0" />
                        <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                        <PolarRadiusAxis tick={{ fontSize: 10, fill: '#94A3B8' }} />
                        {metrics.map((metric, i) => (
                            <Radar
                                key={metric}
                                name={AVAILABLE_METRICS[metric].label}
                                dataKey={metric}
                                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                                fill={CHART_COLORS[i % CHART_COLORS.length]}
                                fillOpacity={0.3}
                                strokeWidth={2}
                            />
                        ))}
                        <Legend />
                        <Tooltip formatter={(value: number, name: string) => [
                            formatValue(value, name as MetricType),
                            AVAILABLE_METRICS[name as MetricType]?.label || name
                        ]} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        );
    }

    if (chartType === 'scatter') {
        const metric1 = metrics[0];
        const metric2 = metrics[1] || metrics[0];
        return (
            <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis
                            type="number"
                            dataKey={metric1}
                            name={AVAILABLE_METRICS[metric1].label}
                            tick={{ fontSize: 12 }}
                            label={{ value: AVAILABLE_METRICS[metric1].label, position: 'bottom', offset: 0 }}
                        />
                        <YAxis
                            type="number"
                            dataKey={metric2}
                            name={AVAILABLE_METRICS[metric2].label}
                            tick={{ fontSize: 12 }}
                            label={{ value: AVAILABLE_METRICS[metric2].label, angle: -90, position: 'insideLeft' }}
                        />
                        <ZAxis range={[100, 500]} />
                        <Tooltip
                            cursor={{ strokeDasharray: '3 3' }}
                            formatter={(value: number, name: string) => [
                                formatValue(value, name as MetricType),
                                AVAILABLE_METRICS[name as MetricType]?.label || name
                            ]}
                            labelFormatter={(_, payload) => payload[0]?.payload?.name || ''}
                        />
                        <Legend />
                        <Scatter
                            name="Data Points"
                            data={chartData}
                            fill={CHART_COLORS[0]}
                        >
                            {chartData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        );
    }

    if (chartType === 'funnel') {
        const funnelData = chartData
            .map((item, index) => ({
                ...item,
                value: item[metrics[0]] || 0,
                fill: CHART_COLORS[index % CHART_COLORS.length],
            }))
            .sort((a, b) => b.value - a.value);

        return (
            <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                    <FunnelChart>
                        <Tooltip formatter={(value: number) => formatValue(value, metrics[0])} />
                        <Funnel
                            dataKey="value"
                            data={funnelData}
                            isAnimationActive
                        >
                            <LabelList
                                position="center"
                                fill="#fff"
                                stroke="none"
                                dataKey="name"
                                fontSize={12}
                            />
                        </Funnel>
                    </FunnelChart>
                </ResponsiveContainer>
            </div>
        );
    }

    if (chartType === 'treemap') {
        const treemapData = chartData.map((item, index) => ({
            name: item.name,
            size: item[metrics[0]] || 0,
            fill: CHART_COLORS[index % CHART_COLORS.length],
        }));

        return (
            <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                        data={treemapData}
                        dataKey="size"
                        aspectRatio={4 / 3}
                        stroke="#fff"
                        fill="#3B82F6"
                        content={({ x, y, width, height, name, value, fill }) => {
                            const displayName = String(name || '');
                            const displayValue = formatValue(Number(value) || 0, metrics[0]);
                            const showLabel = width > 60 && height > 40;
                            return (
                                <g>
                                    <rect
                                        x={x}
                                        y={y}
                                        width={width}
                                        height={height}
                                        fill={fill}
                                        stroke="#fff"
                                        strokeWidth={2}
                                        rx={4}
                                        className="transition-opacity hover:opacity-80"
                                    />
                                    {showLabel && (
                                        <>
                                            <text
                                                x={x + width / 2}
                                                y={y + height / 2 - 8}
                                                textAnchor="middle"
                                                fill="#fff"
                                                fontSize={12}
                                                fontWeight={600}
                                            >
                                                {displayName.length > 15 ? displayName.slice(0, 15) + '...' : displayName}
                                            </text>
                                            <text
                                                x={x + width / 2}
                                                y={y + height / 2 + 10}
                                                textAnchor="middle"
                                                fill="#fff"
                                                fontSize={11}
                                                opacity={0.9}
                                            >
                                                {displayValue}
                                            </text>
                                        </>
                                    )}
                                </g>
                            );
                        }}
                    />
                </ResponsiveContainer>
            </div>
        );
    }

    if (chartType === 'radial_bar') {
        const radialData = chartData.map((item, index) => ({
            ...item,
            value: item[metrics[0]] || 0,
            fill: CHART_COLORS[index % CHART_COLORS.length],
        }));

        return (
            <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="20%"
                        outerRadius="90%"
                        barSize={20}
                        data={radialData}
                        startAngle={180}
                        endAngle={0}
                    >
                        <RadialBar
                            background
                            dataKey="value"
                            cornerRadius={10}
                            label={{ position: 'insideStart', fill: '#fff', fontSize: 11 }}
                        />
                        <Legend
                            iconSize={10}
                            layout="vertical"
                            verticalAlign="middle"
                            align="right"
                            formatter={(value, entry) => {
                                const item = radialData.find(d => d.name === value);
                                return `${value}: ${item ? formatValue(item.value, metrics[0]) : ''}`;
                            }}
                        />
                        <Tooltip formatter={(value: number) => formatValue(value, metrics[0])} />
                    </RadialBarChart>
                </ResponsiveContainer>
            </div>
        );
    }

    if (chartType === 'doughnut') {
        return (
            <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            dataKey={metrics[0]}
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={150}
                            paddingAngle={2}
                            label={(props) => {
                                const percent = ((props.value / chartData.reduce((sum, d) => sum + (d[metrics[0]] || 0), 0)) * 100).toFixed(1);
                                return `${percent}%`;
                            }}
                            labelLine={{ stroke: '#94A3B8', strokeWidth: 1 }}
                        >
                            {chartData.map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatValue(value, metrics[0])} />
                        <Legend />
                        <text
                            x="50%"
                            y="50%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="fill-slate-700"
                        >
                            <tspan x="50%" dy="-0.5em" fontSize={14} fontWeight={600}>
                                Total
                            </tspan>
                            <tspan x="50%" dy="1.5em" fontSize={16} fontWeight={700}>
                                {formatValue(chartData.reduce((sum, d) => sum + (d[metrics[0]] || 0), 0), metrics[0])}
                            </tspan>
                        </text>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        );
    }

    if (chartType === 'composed') {
        return (
            <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                        <Tooltip
                            formatter={(value: number, name: string) => [
                                formatValue(value, name as MetricType),
                                AVAILABLE_METRICS[name as MetricType]?.label || name
                            ]}
                        />
                        <Legend />
                        {metrics.map((metric, i) => {
                            if (i === 0) {
                                return (
                                    <Bar
                                        key={metric}
                                        yAxisId="left"
                                        dataKey={metric}
                                        name={AVAILABLE_METRICS[metric].label}
                                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                                        barSize={40}
                                    />
                                );
                            }
                            return (
                                <Line
                                    key={metric}
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey={metric}
                                    name={AVAILABLE_METRICS[metric].label}
                                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                                    strokeWidth={3}
                                    dot={{ fill: CHART_COLORS[i % CHART_COLORS.length], r: 4 }}
                                />
                            );
                        })}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        );
    }

    return (
        <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                    <BarChart data={chartData} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                            formatter={(value: number, name: string) => [
                                formatValue(value, name as MetricType),
                                AVAILABLE_METRICS[name as MetricType]?.label || name
                            ]}
                        />
                        <Legend />
                        {metrics.map((metric, i) => (
                            <Bar
                                key={metric}
                                dataKey={metric}
                                name={AVAILABLE_METRICS[metric].label}
                                fill={CHART_COLORS[i % CHART_COLORS.length]}
                                radius={[4, 4, 0, 0]}
                            />
                        ))}
                    </BarChart>
                ) : chartType === 'line' ? (
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                            formatter={(value: number, name: string) => [
                                formatValue(value, name as MetricType),
                                AVAILABLE_METRICS[name as MetricType]?.label || name
                            ]}
                        />
                        <Legend />
                        {metrics.map((metric, i) => (
                            <Line
                                key={metric}
                                type="monotone"
                                dataKey={metric}
                                name={AVAILABLE_METRICS[metric].label}
                                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                                strokeWidth={2}
                                dot={{ fill: CHART_COLORS[i % CHART_COLORS.length], r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        ))}
                    </LineChart>
                ) : chartType === 'area' ? (
                    <AreaChart data={chartData}>
                        <defs>
                            {metrics.map((metric, i) => (
                                <linearGradient key={metric} id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.4} />
                                    <stop offset="95%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.05} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                            formatter={(value: number, name: string) => [
                                formatValue(value, name as MetricType),
                                AVAILABLE_METRICS[name as MetricType]?.label || name
                            ]}
                        />
                        <Legend />
                        {metrics.map((metric, i) => (
                            <Area
                                key={metric}
                                type="monotone"
                                dataKey={metric}
                                name={AVAILABLE_METRICS[metric].label}
                                fill={`url(#gradient-${metric})`}
                                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                                strokeWidth={2}
                            />
                        ))}
                    </AreaChart>
                ) : chartType === 'pie' ? (
                    <PieChart>
                        <Pie
                            data={chartData}
                            dataKey={metrics[0]}
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={150}
                            label={(props) => {
                                const name = props.name as string;
                                const value = props.value as number;
                                return `${name}: ${formatValue(value, metrics[0])}`;
                            }}
                        >
                            {chartData.map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatValue(Number(value), metrics[0])} />
                        <Legend />
                    </PieChart>
                ) : (
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                            formatter={(value: number, name: string) => [
                                formatValue(value, name as MetricType),
                                AVAILABLE_METRICS[name as MetricType]?.label || name
                            ]}
                        />
                        <Legend />
                        {metrics.map((metric, i) => (
                            <Bar
                                key={metric}
                                dataKey={metric}
                                name={AVAILABLE_METRICS[metric].label}
                                stackId="a"
                                fill={CHART_COLORS[i % CHART_COLORS.length]}
                            />
                        ))}
                    </BarChart>
                )}
            </ResponsiveContainer>
        </div>
    );
}
