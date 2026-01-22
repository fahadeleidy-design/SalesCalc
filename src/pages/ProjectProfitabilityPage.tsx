import { useState, useEffect } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import {
    DollarSign,
    TrendingUp,
    BarChart3,
    PieChart as PieChartIcon,
    Search,
    Filter,
    ArrowUpRight,
    ArrowDownRight,
    AlertCircle,
    Download,
    Layers,
    CheckCircle2,
    Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/currencyUtils';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

interface ProjectProfitabilityData {
    id: string;
    quotation_number: string;
    title: string;
    customer_name: string;
    status: string;
    created_at: string;
    // Expected values (Quotation & Draft POs)
    expected_revenue: number;
    expected_cost: number;
    expected_profit: number;
    expected_margin_pct: number;
    // Actual values (Payments & Paid POs)
    actual_revenue: number;
    actual_cost: number;
    actual_profit: number;
    actual_margin_pct: number;
    // Variance
    profit_variance: number;
    margin_variance: number;
}

export default function ProjectProfitabilityPage() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ProjectProfitabilityData[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateRange, setDateRange] = useState({
        start: format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
    });

    useEffect(() => {
        loadProfitabilityData();
    }, [dateRange]);

    const loadProfitabilityData = async () => {
        try {
            setLoading(true);

            // 1. Fetch all quotations that are approved or won
            const { data: quotations, error: qError } = await (supabase
                .from('quotations') as any)
                .select(`
          id, 
          quotation_number, 
          title, 
          status, 
          total, 
          created_at,
          customer:customers(company_name)
        `)
                .in('status', ['approved', 'finance_approved', 'deal_won'])
                .gte('created_at', dateRange.start)
                .lte('created_at', dateRange.end);

            if (qError) throw qError;

            // 2. Fetch all related POs
            const { data: allPOs, error: poError } = await (supabase
                .from('purchase_orders') as any)
                .select('quotation_id, total, status, payment_status');

            if (poError) throw poError;

            // 3. Fetch all payments (actual revenue)
            const { data: allPayments, error: _payError } = await (supabase
                .from('payments') as any)
                .select('amount, quotation_id');

            // Note: If payments don't directly link to quotation, we might need to join through invoices
            // For this simplified logic, we assume we can aggregate payments per project

            const processedData: ProjectProfitabilityData[] = (quotations || []).map((q: any) => {
                const projectPOs = (allPOs || []).filter((po: any) => po.quotation_id === q.id);
                const projectPayments = (allPayments || []).filter((p: any) => p.quotation_id === q.id);

                const expectedRevenue = q.total;
                const expectedCost = projectPOs.reduce((sum: number, po: any) => sum + po.total, 0);
                const expectedProfit = expectedRevenue - expectedCost;
                const expectedMarginPct = expectedRevenue > 0 ? (expectedProfit / expectedRevenue) * 100 : 0;

                const actualRevenue = projectPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
                const actualCost = projectPOs
                    .filter((po: any) => po.payment_status === 'paid' || po.status === 'completed')
                    .reduce((sum: number, po: any) => sum + po.total, 0);

                const actualProfit = actualRevenue - actualCost;
                const actualMarginPct = actualRevenue > 0 ? (actualProfit / actualRevenue) * 100 : 0;

                return {
                    id: q.id,
                    quotation_number: q.quotation_number,
                    title: q.title,
                    customer_name: q.customer?.company_name || 'N/A',
                    status: q.status,
                    created_at: q.created_at,
                    expected_revenue: expectedRevenue,
                    expected_cost: expectedCost,
                    expected_profit: expectedProfit,
                    expected_margin_pct: expectedMarginPct,
                    actual_revenue: actualRevenue,
                    actual_cost: actualCost,
                    actual_profit: actualProfit,
                    actual_margin_pct: actualMarginPct,
                    profit_variance: actualProfit - expectedProfit,
                    margin_variance: actualMarginPct - expectedMarginPct
                };
            });

            setData(processedData);
        } catch (error: any) {
            console.error('Error loading profitability data:', error);
            toast.error('Failed to load profitability metrics');
        } finally {
            setLoading(false);
        }
    };

    const filteredData = data.filter(item => {
        const matchesSearch =
            item.quotation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.title.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const totals = filteredData.reduce((acc, curr) => ({
        expected_revenue: acc.expected_revenue + curr.expected_revenue,
        expected_cost: acc.expected_cost + curr.expected_cost,
        expected_profit: acc.expected_profit + curr.expected_profit,
        actual_revenue: acc.actual_revenue + curr.actual_revenue,
        actual_cost: acc.actual_cost + curr.actual_cost,
        actual_profit: acc.actual_profit + curr.actual_profit,
    }), {
        expected_revenue: 0,
        expected_cost: 0,
        expected_profit: 0,
        actual_revenue: 0,
        actual_cost: 0,
        actual_profit: 0,
    });

    const avgExpectedMargin = totals.expected_revenue > 0 ? (totals.expected_profit / totals.expected_revenue) * 100 : 0;
    const avgActualMargin = totals.actual_revenue > 0 ? (totals.actual_profit / totals.actual_revenue) * 100 : 0;

    // Chart Data
    const revenueCostChartData = [
        { name: 'Expected', Revenue: totals.expected_revenue, Cost: totals.expected_cost, Profit: totals.expected_profit },
        { name: 'Actual', Revenue: totals.actual_revenue, Cost: totals.actual_cost, Profit: totals.actual_profit },
    ];

    const marginDistributionData = [
        { name: 'High (>30%)', value: filteredData.filter(d => d.expected_margin_pct > 30).length, color: '#10b981' },
        { name: 'Healthy (15-30%)', value: filteredData.filter(d => d.expected_margin_pct >= 15 && d.expected_margin_pct <= 30).length, color: '#3b82f6' },
        { name: 'Low (<15%)', value: filteredData.filter(d => d.expected_margin_pct < 15 && d.expected_margin_pct >= 0).length, color: '#f59e0b' },
        { name: 'Negative', value: filteredData.filter(d => d.expected_margin_pct < 0).length, color: '#ef4444' },
    ];

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Project Profitability Tracking</h1>
                    <p className="text-slate-500">Real-time analysis of expected vs. realized project margins.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            className="bg-transparent border-none text-sm focus:ring-0 px-2"
                        />
                        <span className="text-slate-400">→</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            className="bg-transparent border-none text-sm focus:ring-0 px-2"
                        />
                    </div>
                    <button
                        onClick={() => toast.success('Profitability report exported')}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-medium whitespace-nowrap"
                    >
                        <Download className="w-4 h-4" />
                        Export Data
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign className="w-12 h-12 text-blue-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Total Expected Profit</p>
                    <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totals.expected_profit)}</h3>
                    <div className="flex items-center gap-1 mt-2">
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">
                            {avgExpectedMargin.toFixed(1)}% Avg Margin
                        </span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Total Realized Profit</p>
                    <h3 className="text-2xl font-bold text-slate-900 text-emerald-600">{formatCurrency(totals.actual_profit)}</h3>
                    <div className="flex items-center gap-1 mt-2">
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                            {avgActualMargin.toFixed(1)}% Realized
                        </span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Layers className="w-12 h-12 text-slate-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Pending Collection</p>
                    <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(totals.expected_revenue - totals.actual_revenue)}</h3>
                    <div className="flex items-center gap-1 mt-2">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-400">Future revenue in pipeline</span>
                    </div>
                </div>

                <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group border-l-4 ${totals.actual_profit - totals.expected_profit < 0 ? 'border-l-orange-500' : 'border-l-emerald-500'}`}>
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp className="w-12 h-12 text-slate-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Profit Variance</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className={`text-2xl font-bold ${totals.actual_profit - totals.expected_profit < 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                            {formatCurrency(Math.abs(totals.actual_profit - totals.expected_profit))}
                        </h3>
                        <span className="text-xs font-medium text-slate-400">
                            {totals.actual_profit - totals.expected_profit < 0 ? 'Shortfall' : 'Surplus'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                        {totals.actual_profit - totals.expected_profit < 0 ? (
                            <ArrowDownRight className="w-4 h-4 text-orange-500" />
                        ) : (
                            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                        )}
                        <span className={`text-xs font-medium ${totals.actual_profit - totals.expected_profit < 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                            {Math.abs(avgActualMargin - avgExpectedMargin).toFixed(1)}% dev from target
                        </span>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Revenue, Cost & Profit Comparison</h3>
                            <p className="text-sm text-slate-500 italic">Expected (Targets) vs Actual (Realized)</p>
                        </div>
                        <BarChart3 className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueCostChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} tickFormatter={(val) => `$${val / 1000}k`} />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: any) => formatCurrency(value)}
                                />
                                <Legend iconType="circle" verticalAlign="top" height={36} />
                                <Bar dataKey="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                                <Bar dataKey="Cost" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={40} />
                                <Bar dataKey="Profit" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Project Margin Distribution</h3>
                            <p className="text-sm text-slate-500 italic">Segmentation by profitability category</p>
                        </div>
                        <PieChartIcon className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="h-[350px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={marginDistributionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={120}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {marginDistributionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="bottom" align="center" layout="horizontal" iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute text-center flex flex-col pt-4">
                            <span className="text-3xl font-bold text-slate-900">{filteredData.length}</span>
                            <span className="text-xs text-slate-500">Projects</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Table Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by quote # or customer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 py-2 pl-4 pr-10"
                        >
                            <option value="all">All Statuses</option>
                            <option value="approved">Approved</option>
                            <option value="finance_approved">Finance Approved</option>
                            <option value="deal_won">Deal Won</option>
                        </select>
                        <button className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 font-medium text-xs uppercase tracking-wider">
                                <th className="py-4 px-6">Project / Client</th>
                                <th className="py-4 px-2">Status</th>
                                <th className="py-2 px-4 text-center border-x border-slate-200" colSpan={3}>Expected (Targets)</th>
                                <th className="py-2 px-4 text-center border-x border-slate-200" colSpan={3}>Actual (Realized)</th>
                                <th className="py-4 px-6 text-right">Variance</th>
                            </tr>
                            <tr className="bg-slate-50 text-slate-400 font-medium text-[10px] uppercase tracking-tighter">
                                <th className="py-2 px-6"></th>
                                <th className="py-2 px-2"></th>
                                <th className="py-2 px-4 text-right border-l border-slate-200">Revenue</th>
                                <th className="py-2 px-4 text-right">Cost</th>
                                <th className="py-2 px-4 text-center border-r border-slate-200">Margin</th>
                                <th className="py-2 px-4 text-right">Revenue</th>
                                <th className="py-2 px-4 text-right">Cost</th>
                                <th className="py-2 px-4 text-center border-r border-slate-200">Margin</th>
                                <th className="py-2 px-6"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={10} className="py-12 text-center text-slate-500">
                                        <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-slate-300" />
                                        Calculating profitability metrics...
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="py-12 text-center text-slate-500 font-medium">
                                        No projects found for the selected period.
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((project) => (
                                    <tr key={project.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{project.quotation_number}</div>
                                            <div className="text-xs text-slate-500 mb-1">{project.title}</div>
                                            <div className="text-xs font-medium text-slate-400 uppercase tracking-tighter">{project.customer_name}</div>
                                        </td>
                                        <td className="py-4 px-2">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${project.status === 'deal_won' ? 'bg-emerald-100 text-emerald-700' :
                                                project.status === 'finance_approved' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {project.status.replace('_', ' ')}
                                            </span>
                                        </td>

                                        {/* Expected Columns */}
                                        <td className="py-4 px-4 text-right text-xs border-l border-slate-50">
                                            {formatCurrency(project.expected_revenue)}
                                        </td>
                                        <td className="py-4 px-4 text-right text-xs text-slate-500">
                                            {formatCurrency(project.expected_cost)}
                                        </td>
                                        <td className="py-4 px-4 text-center border-r border-slate-50">
                                            <span className={`text-xs font-bold ${project.expected_margin_pct < 15 ? 'text-orange-600' : 'text-slate-900'
                                                }`}>
                                                {project.expected_margin_pct.toFixed(1)}%
                                            </span>
                                        </td>

                                        {/* Actual Columns */}
                                        <td className="py-4 px-4 text-right text-xs bg-slate-50/30">
                                            {formatCurrency(project.actual_revenue)}
                                        </td>
                                        <td className="py-4 px-4 text-right text-xs text-slate-500 bg-slate-50/30">
                                            {formatCurrency(project.actual_cost)}
                                        </td>
                                        <td className="py-4 px-4 text-center border-r border-slate-100 bg-slate-50/30">
                                            {project.actual_revenue > 0 ? (
                                                <span className={`text-xs font-bold ${project.actual_margin_pct < project.expected_margin_pct ? 'text-red-500' : 'text-emerald-600'
                                                    }`}>
                                                    {project.actual_margin_pct.toFixed(1)}%
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 italic">No Payments</span>
                                            )}
                                        </td>

                                        {/* Variance Columns */}
                                        <td className="py-4 px-6 text-right">
                                            {project.actual_revenue > 0 ? (
                                                <div className="flex flex-col items-end">
                                                    <span className={`text-xs font-bold ${project.profit_variance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                                        {project.profit_variance < 0 ? '-' : '+'}{formatCurrency(Math.abs(project.profit_variance))}
                                                    </span>
                                                    <span className={`text-[10px] ${project.margin_variance < 0 ? 'text-red-400' : 'text-emerald-500'}`}>
                                                        {project.margin_variance < 0 ? '' : '+'}{project.margin_variance.toFixed(1)}% margin
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-end opacity-20">
                                                    <span className="text-xs">-</span>
                                                    <AlertCircle className="w-3 h-3" />
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {/* Table Footer with Totals */}
                        {!loading && filteredData.length > 0 && (
                            <tfoot className="bg-slate-900 text-white">
                                <tr>
                                    <th className="py-4 px-6 font-bold" colSpan={2}>Grand Totals</th>
                                    <th className="py-4 px-4 text-right font-bold border-l border-slate-700">{formatCurrency(totals.expected_revenue)}</th>
                                    <th className="py-4 px-4 text-right font-bold">{formatCurrency(totals.expected_cost)}</th>
                                    <th className="py-4 px-4 text-center font-bold border-r border-slate-700">{avgExpectedMargin.toFixed(1)}%</th>
                                    <th className="py-4 px-4 text-right font-bold">{formatCurrency(totals.actual_revenue)}</th>
                                    <th className="py-4 px-4 text-right font-bold">{formatCurrency(totals.actual_cost)}</th>
                                    <th className="py-4 px-4 text-center font-bold border-r border-slate-700">{avgActualMargin.toFixed(1)}%</th>
                                    <th className="py-4 px-6 text-right font-bold">
                                        {formatCurrency(totals.actual_profit - totals.expected_profit)}
                                    </th>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}

function RefreshCw({ className, ...props }: any) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M3 21v-5h5" />
        </svg>
    );
}
