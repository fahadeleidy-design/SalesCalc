import { supabase } from './supabase';

// =============================================================================
// Types
// =============================================================================

export type DataSourceType =
    | 'quotations'
    | 'leads'
    | 'opportunities'
    | 'collections'
    | 'purchase_orders';

export type DimensionType =
    | 'sales_rep'
    | 'customer'
    | 'product'
    | 'product_category'
    | 'time_period'
    | 'status'
    | 'manager'
    | 'sector'
    | 'stage'
    | 'source'
    | 'supplier'
    | 'payment_method';

export type MetricType =
    | 'total_revenue'
    | 'avg_deal_size'
    | 'total_cost'
    | 'total_profit'
    | 'profit_margin_pct'
    | 'quotation_count'
    | 'win_rate'
    | 'total_commission'
    | 'avg_margin'
    | 'pipeline_value'
    | 'conversion_rate'
    | 'avg_lead_score'
    | 'collection_amount'
    | 'po_total'
    | 'tax_amount';

export type ChartType =
    | 'grid'
    | 'bar'
    | 'line'
    | 'pie'
    | 'area'
    | 'stacked_bar';

export type FilterOperator =
    | 'equals'
    | 'not_equals'
    | 'in'
    | 'greater_than'
    | 'less_than'
    | 'between'
    | 'contains';

export type TimePeriod =
    | 'today'
    | 'this_week'
    | 'this_month'
    | 'this_quarter'
    | 'this_year'
    | 'last_30_days'
    | 'last_90_days'
    | 'custom';

export interface Dimension {
    type: DimensionType;
    label: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
}

export interface Metric {
    type: MetricType;
    label: string;
    format: 'currency' | 'number' | 'percentage';
    decimals?: number;
}

export interface Filter {
    field: string;
    operator: FilterOperator;
    value: string | string[] | number | number[] | { start: string; end: string };
}

export interface ReportConfig {
    dataSource: DataSourceType;
    dimensions: Dimension[];
    metrics: Metric[];
    filters: Filter[];
    visualization: {
        type: ChartType;
        showGrid: boolean;
        showChart: boolean;
    };
    dateRange?: {
        preset: TimePeriod;
        startDate?: string;
        endDate?: string;
    };
}

export interface CustomReport {
    id: string;
    name: string;
    description?: string;
    tags?: string[];
    folder_id?: string;
    report_config: ReportConfig;
    created_by: string;
    is_template: boolean;
    is_favorite: boolean;
    is_public: boolean;
    version: number;
    last_run_at?: string;
    run_count: number;
    created_at: string;
    updated_at: string;
}

export interface ReportResult {
    data: Record<string, any>[];
    metadata: {
        rowCount: number;
        executionTimeMs: number;
        cached: boolean;
    };
}

// =============================================================================
// Dimension Definitions
// =============================================================================

export const AVAILABLE_DIMENSIONS: Record<DimensionType, { label: string; field: string; joins?: string }> = {
    sales_rep: {
        label: 'Sales Representative',
        field: 'sales_rep_id',
        joins: 'profiles'
    },
    customer: {
        label: 'Customer',
        field: 'customer_id',
        joins: 'customers'
    },
    product: {
        label: 'Product',
        field: 'product_id',
        joins: 'products'
    },
    product_category: {
        label: 'Product Category',
        field: 'category'
    },
    time_period: {
        label: 'Time Period',
        field: 'created_at'
    },
    status: {
        label: 'Status',
        field: 'status'
    },
    manager: {
        label: 'Sales Manager',
        field: 'manager_id'
    },
    sector: {
        label: 'Customer Sector',
        field: 'sector'
    },
    stage: {
        label: 'Sales Stage',
        field: 'stage'
    },
    source: {
        label: 'Lead Source',
        field: 'source'
    },
    supplier: {
        label: 'Supplier',
        field: 'supplier_id',
        joins: 'suppliers'
    },
    payment_method: {
        label: 'Payment Method',
        field: 'payment_method'
    }
};

// =============================================================================
// Metric Definitions  
// =============================================================================

export const AVAILABLE_METRICS: Record<MetricType, { label: string; definition: string; format: 'currency' | 'number' | 'percentage' }> = {
    total_revenue: {
        label: 'Total Revenue',
        definition: 'SUM(total)',
        format: 'currency'
    },
    avg_deal_size: {
        label: 'Average Deal Size',
        definition: 'AVG(total)',
        format: 'currency'
    },
    total_cost: {
        label: 'Total Cost',
        definition: 'SUM of item costs',
        format: 'currency'
    },
    total_profit: {
        label: 'Total Profit',
        definition: 'Revenue - Cost',
        format: 'currency'
    },
    profit_margin_pct: {
        label: 'Profit Margin %',
        definition: '(Profit / Revenue) × 100',
        format: 'percentage'
    },
    quotation_count: {
        label: 'Quotation Count',
        definition: 'COUNT(quotations)',
        format: 'number'
    },
    win_rate: {
        label: 'Win Rate %',
        definition: '(Won / Total) × 100',
        format: 'percentage'
    },
    total_commission: {
        label: 'Total Commission',
        definition: 'SUM(commission_amount)',
        format: 'currency'
    },
    avg_margin: {
        label: 'Average Margin %',
        definition: 'AVG(profit_margin)',
        format: 'percentage'
    },
    pipeline_value: {
        label: 'Pipeline Value',
        definition: 'SUM(expected_revenue)',
        format: 'currency'
    },
    conversion_rate: {
        label: 'Conversion Rate %',
        definition: '(Converted / Total) × 100',
        format: 'percentage'
    },
    avg_lead_score: {
        label: 'Avg Lead Score',
        definition: 'AVG(score)',
        format: 'number'
    },
    collection_amount: {
        label: 'Collection Amount',
        definition: 'SUM(amount_collected)',
        format: 'currency'
    },
    po_total: {
        label: 'PO Total',
        definition: 'SUM(total_amount)',
        format: 'currency'
    },
    tax_amount: {
        label: 'Tax Amount',
        definition: 'SUM(tax)',
        format: 'currency'
    }
};

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Get all reports for the current user (own + shared + templates)
 */
export async function getReports(): Promise<CustomReport[]> {
    const { data, error } = await supabase
        .from('custom_reports')
        .select('*')
        .order('is_favorite', { ascending: false })
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching reports:', error);
        throw error;
    }

    return data || [];
}

/**
 * Get a single report by ID
 */
export async function getReport(id: string): Promise<CustomReport | null> {
    const { data, error } = await supabase
        .from('custom_reports')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching report:', error);
        throw error;
    }

    return data;
}

/**
 * Create a new custom report
 */
export async function createReport(report: {
    name: string;
    description?: string;
    tags?: string[];
    report_config: ReportConfig;
    is_template?: boolean;
}): Promise<CustomReport> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data, error } = await ((supabase.from('custom_reports') as any)
        .insert({
            name: report.name,
            description: report.description,
            tags: report.tags || [],
            report_config: report.report_config,
            created_by: user.user.id,
            is_template: report.is_template || false,
        })
        .select()
        .single());

    if (error) {
        console.error('❌ Error creating report:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
        throw error;
    }

    return data;
}

/**
 * Update an existing report
 */
export async function updateReport(id: string, updates: Partial<{
    name: string;
    description: string;
    tags: string[];
    report_config: ReportConfig;
    is_favorite: boolean;
    folder_id: string;
}>): Promise<CustomReport> {
    // For now, we'll manually increment the version if it was provided
    // or just let it stay as is if the RPC fails.
    const { data, error } = await ((supabase.from('custom_reports') as any)
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single());

    if (error) {
        console.error('❌ Error updating report:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
        throw error;
    }

    return data;
}

/**
 * Delete a report
 */
export async function deleteReport(id: string): Promise<void> {
    const { error } = await supabase
        .from('custom_reports')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting report:', error);
        throw error;
    }
}

/**
 * Export results to CSV
 */
export function exportToCSV(data: Record<string, any>[], filename: string) {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const value = row[header] ?? '';
            // Escape commas and quotes
            const escaped = String(value).replace(/"/g, '""');
            return `"${escaped}"`;
        }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
    const { error } = await ((supabase.from('custom_reports') as any)
        .update({ is_favorite: isFavorite })
        .eq('id', id));

    if (error) {
        console.error('Error toggling favorite:', error);
        throw error;
    }
}

/**
 * Duplicate a report
 */
export async function duplicateReport(id: string): Promise<CustomReport> {
    const original = await getReport(id);
    if (!original) throw new Error('Report not found');

    return createReport({
        name: `${original.name} (Copy)`,
        description: original.description,
        tags: original.tags,
        report_config: {
            ...original.report_config,
            dataSource: original.report_config.dataSource || 'quotations'
        },
    });
}

// =============================================================================
// Report Execution
// =============================================================================

/**
 * Execute a report and return results
 */
export async function executeReport(config: ReportConfig): Promise<ReportResult> {
    const startTime = Date.now();

    try {
        // Build the query based on config
        const results = await buildAndExecuteQuery(config);

        const executionTimeMs = Date.now() - startTime;

        return {
            data: results,
            metadata: {
                rowCount: results.length,
                executionTimeMs,
                cached: false,
            },
        };
    } catch (error) {
        console.error('Error executing report:', error);
        throw error;
    }
}

/**
 * Build and execute the dynamic query based on report configuration
 */
async function buildAndExecuteQuery(config: ReportConfig): Promise<Record<string, any>[]> {
    const dateFilter = getDateFilter(config.dateRange);
    let query: any;

    switch (config.dataSource) {
        case 'leads':
            query = supabase.from('crm_leads').select(`
                *,
                profiles:assigned_to (id, full_name)
            `);
            break;
        case 'opportunities':
            query = supabase.from('crm_opportunities').select(`
                *,
                profiles:assigned_to (id, full_name),
                customers (id, company_name)
            `);
            break;
        case 'collections':
            query = supabase.from('collections').select(`
                *,
                quotations (id, quotation_number, customer_id, customers(company_name))
            `);
            break;
        case 'purchase_orders':
            query = supabase.from('purchase_orders').select(`
                *,
                suppliers (id, name),
                quotations (id, quotation_number)
            `);
            break;
        case 'quotations':
        default:
            query = supabase.from('quotations').select(`
                id,
                quotation_number,
                title,
                total,
                status,
                created_at,
                sales_rep_id,
                customer_id,
                profiles!sales_rep_id (id, full_name),
                customers!customer_id (id, company_name, sector, customer_type),
                quotation_items (
                    quantity,
                    unit_price,
                    products (id, name, category, cost_price)
                )
            `);
            break;
    }

    // Apply date filter
    const dateField = config.dataSource === 'leads' ? 'created_at' :
        config.dataSource === 'opportunities' ? 'created_at' :
            config.dataSource === 'collections' ? 'payment_date' :
                config.dataSource === 'purchase_orders' ? 'po_date' : 'created_at';

    if (dateFilter.start) {
        query = query.gte(dateField, dateFilter.start);
    }
    if (dateFilter.end) {
        query = query.lte(dateField, dateFilter.end);
    }

    // Apply custom filters
    for (const filter of config.filters) {
        query = applyFilter(query, filter);
    }

    const { data, error } = await query;

    if (error) {
        throw error;
    }

    // Transform and aggregate data based on dimensions and metrics
    return aggregateResults(data || [], config);
}

/**
 * Get date filter based on preset or custom range
 */
function getDateFilter(dateRange?: ReportConfig['dateRange']): { start?: string; end?: string } {
    if (!dateRange) {
        // Default to this month
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: start.toISOString() };
    }

    const now = new Date();

    switch (dateRange.preset) {
        case 'today':
            return {
                start: new Date(now.setHours(0, 0, 0, 0)).toISOString(),
                end: new Date().toISOString()
            };
        case 'this_week': {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            weekStart.setHours(0, 0, 0, 0);
            return { start: weekStart.toISOString() };
        }
        case 'this_month': {
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            return { start: monthStart.toISOString() };
        }
        case 'this_quarter': {
            const quarter = Math.floor(now.getMonth() / 3);
            const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
            return { start: quarterStart.toISOString() };
        }
        case 'this_year': {
            const yearStart = new Date(now.getFullYear(), 0, 1);
            return { start: yearStart.toISOString() };
        }
        case 'last_30_days': {
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(now.getDate() - 30);
            return { start: thirtyDaysAgo.toISOString() };
        }
        case 'last_90_days': {
            const ninetyDaysAgo = new Date(now);
            ninetyDaysAgo.setDate(now.getDate() - 90);
            return { start: ninetyDaysAgo.toISOString() };
        }
        case 'custom':
            return {
                start: dateRange.startDate,
                end: dateRange.endDate
            };
        default:
            return {};
    }
}

/**
 * Apply a filter to the Supabase query
 */
function applyFilter(query: any, filter: Filter): any {
    switch (filter.operator) {
        case 'equals':
            return query.eq(filter.field, filter.value);
        case 'not_equals':
            return query.neq(filter.field, filter.value);
        case 'in':
            return query.in(filter.field, filter.value as string[]);
        case 'greater_than':
            return query.gt(filter.field, filter.value);
        case 'less_than':
            return query.lt(filter.field, filter.value);
        case 'between': {
            const range = filter.value as { start: string; end: string };
            return query.gte(filter.field, range.start).lte(filter.field, range.end);
        }
        case 'contains':
            return query.ilike(filter.field, `%${filter.value}%`);
        default:
            return query;
    }
}

/**
 * Aggregate results based on dimensions and calculate metrics
 */
function aggregateResults(
    rawData: any[],
    config: ReportConfig
): Record<string, any>[] {
    if (rawData.length === 0) return [];

    // Group data by dimensions
    const groups = new Map<string, any[]>();

    for (const row of rawData) {
        const groupKey = config.dimensions
            .map(dim => getDimensionValue(row, dim.type))
            .join('|');

        if (!groups.has(groupKey)) {
            groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(row);
    }

    // Calculate metrics for each group
    const results: Record<string, any>[] = [];

    for (const [groupKey, rows] of groups) {
        const dimensionValues = groupKey.split('|');
        const result: Record<string, any> = {};

        // Add dimension values
        config.dimensions.forEach((dim, index) => {
            result[dim.type] = dimensionValues[index];
            result[`${dim.type}_label`] = getDimensionLabel(rows[0], dim.type);
        });

        // Calculate metrics
        for (const metric of config.metrics) {
            result[metric.type] = calculateMetric(rows, metric.type);
        }

        results.push(result);
    }

    // Sort by first metric descending
    if (config.metrics.length > 0) {
        const sortMetric = config.metrics[0].type;
        results.sort((a, b) => (b[sortMetric] || 0) - (a[sortMetric] || 0));
    }

    // Apply limit if specified
    const primaryDimension = config.dimensions[0];
    if (primaryDimension?.limit) {
        return results.slice(0, primaryDimension.limit);
    }

    return results;
}

/**
 * Get dimension value from a row
 */
function getDimensionValue(row: any, dimension: DimensionType): string {
    switch (dimension) {
        case 'sales_rep':
            return row.sales_rep_id || row.assigned_to || row.profiles?.id || 'unknown';
        case 'customer':
            return row.customer_id || row.customers?.id || 'unknown';
        case 'product':
            return row.quotation_items?.[0]?.product_id || 'unknown';
        case 'product_category':
            return row.quotation_items?.[0]?.products?.category || 'Uncategorized';
        case 'time_period': {
            const dateStr = row.created_at || row.payment_date || row.po_date;
            if (!dateStr) return 'unknown';
            const date = new Date(dateStr);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        case 'status':
            return row.status || 'unknown';
        case 'sector':
            return row.customers?.sector || 'Unknown';
        case 'stage':
            return row.stage || 'unknown';
        case 'source':
            return row.source || 'unknown';
        case 'supplier':
            return row.suppliers?.name || 'Unknown';
        case 'payment_method':
            return row.payment_method || 'unknown';
        default:
            return 'unknown';
    }
}

/**
 * Get dimension label (display name) from a row
 */
function getDimensionLabel(row: any, dimension: DimensionType): string {
    switch (dimension) {
        case 'sales_rep':
            return row.profiles?.full_name || row.assigned_to_profile?.full_name || 'Unknown Rep';
        case 'customer':
            return row.customers?.company_name || row.quotations?.customers?.company_name || 'Unknown Customer';
        case 'product':
            return row.quotation_items?.[0]?.products?.name || 'Unknown Product';
        case 'product_category':
            return row.quotation_items?.[0]?.products?.category || 'Uncategorized';
        case 'time_period': {
            const dateStr = row.created_at || row.payment_date || row.po_date;
            if (!dateStr) return 'Unknown';
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        }
        case 'status':
            return formatStatus(row.status);
        case 'sector':
            return row.customers?.sector || 'Unknown Sector';
        case 'stage':
            return row.stage?.replace(/_/g, ' ') || 'Unknown Stage';
        case 'source':
            return row.source || 'Unknown Source';
        case 'supplier':
            return row.suppliers?.name || 'Unknown Supplier';
        case 'payment_method':
            return row.payment_method ? row.payment_method.replace(/_/g, ' ') : 'Unknown Method';
        default:
            return 'Unknown';
    }
}

/**
 * Calculate a metric value for a group of rows
 */
function calculateMetric(rows: any[], metric: MetricType): number {
    switch (metric) {
        case 'total_revenue':
            return rows.reduce((sum, row) => sum + (row.total || 0), 0);

        case 'avg_deal_size': {
            const total = rows.reduce((sum, row) => sum + (row.total || 0), 0);
            return rows.length > 0 ? total / rows.length : 0;
        }

        case 'total_cost': {
            return rows.reduce((sum, row) => {
                const itemCosts = (row.quotation_items || []).reduce((itemSum: number, item: any) => {
                    const cost = (item.products?.cost_price || 0) * (item.quantity || 0);
                    return itemSum + cost;
                }, 0);
                return sum + itemCosts;
            }, 0);
        }

        case 'total_profit': {
            const revenue = calculateMetric(rows, 'total_revenue');
            const cost = calculateMetric(rows, 'total_cost');
            return revenue - cost;
        }

        case 'profit_margin_pct': {
            const revenue = calculateMetric(rows, 'total_revenue');
            const profit = calculateMetric(rows, 'total_profit');
            return revenue > 0 ? (profit / revenue) * 100 : 0;
        }

        case 'quotation_count':
            return rows.length;

        case 'win_rate': {
            const won = rows.filter(r => r.status === 'deal_won' || r.status === 'closed_won').length;
            return rows.length > 0 ? (won / rows.length) * 100 : 0;
        }

        case 'total_commission':
            return rows.reduce((sum, row) => sum + (row.commission_amount || 0), 0);

        case 'avg_margin': {
            const margins = rows.map(row => {
                const revenue = row.total || 0;
                const cost = (row.quotation_items || []).reduce((sum: number, item: any) => {
                    return sum + ((item.products?.cost_price || 0) * (item.quantity || 0));
                }, 0);
                return revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
            });
            return margins.length > 0
                ? margins.reduce((sum, m) => sum + m, 0) / margins.length
                : 0;
        }

        case 'pipeline_value':
            return rows.reduce((sum, row) => sum + (row.expected_revenue || 0), 0);

        case 'conversion_rate': {
            const converted = rows.filter(r => r.converted === true || r.status === 'converted').length;
            return rows.length > 0 ? (converted / rows.length) * 100 : 0;
        }

        case 'avg_lead_score': {
            const scores = rows.filter(r => typeof r.score === 'number').map(r => r.score);
            return scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;
        }

        case 'collection_amount':
            return rows.reduce((sum, row) => sum + (row.amount_collected || 0), 0);

        case 'po_total':
            return rows.reduce((sum, row) => sum + (row.total_amount || 0), 0);

        case 'tax_amount':
            return rows.reduce((sum, row) => sum + (row.tax || 0), 0);

        default:
            return 0;
    }
}

/**
 * Format status for display
 */
function formatStatus(status: string): string {
    if (!status) return 'Unknown';
    const statusMap: Record<string, string> = {
        draft: 'Draft',
        pending_pricing: 'Pending Pricing',
        pending_manager: 'Pending Manager',
        pending_ceo: 'Pending CEO',
        approved: 'Approved',
        pending_finance: 'Pending Finance',
        finance_approved: 'Finance Approved',
        submitted_to_customer: 'Submitted',
        deal_won: 'Won',
        deal_lost: 'Lost',
        rejected: 'Rejected',
        changes_requested: 'Changes Requested',
        // CRM
        converted: 'Converted',
        new: 'New',
        contacted: 'Contacted',
        qualified: 'Qualified',
        discovery: 'Discovery',
        proposal: 'Proposal',
        negotiation: 'Negotiation',
        closed_won: 'Won (CRM)',
        closed_lost: 'Lost (CRM)',
    };
    return statusMap[status] || status.replace(/_/g, ' ');
}

// =============================================================================
// Template Reports
// =============================================================================

export const REPORT_TEMPLATES: { name: string; description: string; config: ReportConfig }[] = [
    {
        name: 'Revenue by Sales Rep',
        description: 'Compare total revenue generated by each sales representative',
        config: {
            dataSource: 'quotations',
            dimensions: [{ type: 'sales_rep', label: 'Sales Rep' }],
            metrics: [
                { type: 'total_revenue', label: 'Total Revenue', format: 'currency' },
                { type: 'quotation_count', label: 'Deals', format: 'number' },
                { type: 'avg_deal_size', label: 'Avg Deal', format: 'currency' },
            ],
            filters: [],
            visualization: { type: 'bar', showGrid: true, showChart: true },
            dateRange: { preset: 'this_month' },
        },
    },
    {
        name: 'Monthly Revenue Trend',
        description: 'Track revenue trends over time',
        config: {
            dataSource: 'quotations',
            dimensions: [{ type: 'time_period', label: 'Month' }],
            metrics: [
                { type: 'total_revenue', label: 'Revenue', format: 'currency' },
                { type: 'total_profit', label: 'Profit', format: 'currency' },
            ],
            filters: [],
            visualization: { type: 'line', showGrid: true, showChart: true },
            dateRange: { preset: 'this_year' },
        },
    },
    {
        name: 'Customer Analysis',
        description: 'Analyze top customers by revenue and profit margin',
        config: {
            dataSource: 'quotations',
            dimensions: [{ type: 'customer', label: 'Customer', limit: 10 }],
            metrics: [
                { type: 'total_revenue', label: 'Revenue', format: 'currency' },
                { type: 'total_profit', label: 'Profit', format: 'currency' },
                { type: 'profit_margin_pct', label: 'Margin %', format: 'percentage' },
            ],
            filters: [],
            visualization: { type: 'bar', showGrid: true, showChart: true },
            dateRange: { preset: 'this_quarter' },
        },
    },
    {
        name: 'Product Profitability',
        description: 'Analyze profit margins by product category',
        config: {
            dataSource: 'quotations',
            dimensions: [{ type: 'product_category', label: 'Category' }],
            metrics: [
                { type: 'total_revenue', label: 'Revenue', format: 'currency' },
                { type: 'total_cost', label: 'Cost', format: 'currency' },
                { type: 'profit_margin_pct', label: 'Margin %', format: 'percentage' },
            ],
            filters: [],
            visualization: { type: 'stacked_bar', showGrid: true, showChart: true },
            dateRange: { preset: 'this_quarter' },
        },
    },
    {
        name: 'Sector Performance',
        description: 'Compare performance across customer sectors',
        config: {
            dataSource: 'quotations',
            dimensions: [{ type: 'sector', label: 'Sector' }],
            metrics: [
                { type: 'total_revenue', label: 'Revenue', format: 'currency' },
                { type: 'quotation_count', label: 'Deals', format: 'number' },
                { type: 'win_rate', label: 'Win Rate', format: 'percentage' },
            ],
            filters: [],
            visualization: { type: 'pie', showGrid: true, showChart: true },
            dateRange: { preset: 'this_year' },
        },
    },
    {
        name: 'Weekly Collections Overview',
        description: 'Track collection efficiency and payment methods (Finance)',
        config: {
            dataSource: 'collections',
            dimensions: [{ type: 'payment_method', label: 'Payment Method' }],
            metrics: [
                { type: 'collection_amount', label: 'Amount Collected', format: 'currency' },
                { type: 'tax_amount', label: 'Tax', format: 'currency' },
            ],
            filters: [],
            visualization: { type: 'bar', showGrid: true, showChart: true },
            dateRange: { preset: 'this_week' },
        },
    },
    {
        name: 'Team Pipeline Health',
        description: 'Monitor pipeline value by sales representative (Sales Manager)',
        config: {
            dataSource: 'opportunities',
            dimensions: [{ type: 'sales_rep', label: 'Sales Rep' }],
            metrics: [
                { type: 'pipeline_value', label: 'Pipeline', format: 'currency' },
                { type: 'avg_deal_size', label: 'Avg Deal', format: 'currency' },
            ],
            filters: [],
            visualization: { type: 'bar', showGrid: true, showChart: true },
            dateRange: { preset: 'this_month' },
        },
    },
    {
        name: 'Quarterly Revenue Dashboard',
        description: 'High-level performance summary of all revenue streams (CEO)',
        config: {
            dataSource: 'quotations',
            dimensions: [{ type: 'time_period', label: 'Month' }],
            metrics: [
                { type: 'total_revenue', label: 'Revenue', format: 'currency' },
                { type: 'total_profit', label: 'Profit', format: 'currency' },
                { type: 'profit_margin_pct', label: 'Margin %', format: 'percentage' },
            ],
            filters: [],
            visualization: { type: 'area', showGrid: true, showChart: true },
            dateRange: { preset: 'this_quarter' },
        },
    },
];
