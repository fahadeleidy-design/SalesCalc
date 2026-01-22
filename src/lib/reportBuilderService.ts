import { supabase } from './supabase';

// =============================================================================
// Types
// =============================================================================

export type DimensionType =
    | 'sales_rep'
    | 'customer'
    | 'product'
    | 'product_category'
    | 'time_period'
    | 'status'
    | 'manager'
    | 'sector';

export type MetricType =
    | 'total_revenue'
    | 'avg_deal_size'
    | 'total_cost'
    | 'total_profit'
    | 'profit_margin_pct'
    | 'quotation_count'
    | 'win_rate'
    | 'total_commission'
    | 'avg_margin';

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
        joins: 'profiles!quotations_sales_rep_id_fkey'
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
        report_config: original.report_config,
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
    // Get date range from filters
    const dateFilter = getDateFilter(config.dateRange);

    // Base query on quotations with status filter
    let query = supabase
        .from('quotations')
        .select(`
      id,
      quotation_number,
      title,
      total,
      discount_percentage,
      status,
      created_at,
      updated_at,
      sales_rep_id,
      customer_id,
      profiles!sales_rep_id (
        id,
        full_name
      ),
      customers!customer_id (
        id,
        company_name,
        sector,
        customer_type
      ),
      quotation_items (
        id,
        quantity,
        unit_price,
        product_id,
        products (
          id,
          name,
          category,
          cost_price
        )
      )
    `)
        .in('status', ['approved', 'deal_won', 'finance_approved', 'submitted_to_customer']) as any;

    // Apply date filter
    if (dateFilter.start) {
        query = query.gte('created_at', dateFilter.start);
    }
    if (dateFilter.end) {
        query = query.lte('created_at', dateFilter.end);
    }

    // Apply custom filters
    for (const filter of config.filters) {
        query = applyFilter(query, filter);
    }

    const { data, error } = await query;

    if (error) {
        console.error('❌ Dynamic Query error:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
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
 * Get dimension value from a quotation row
 */
function getDimensionValue(row: any, dimension: DimensionType): string {
    switch (dimension) {
        case 'sales_rep':
            return row.sales_rep_id || 'unknown';
        case 'customer':
            return row.customer_id || 'unknown';
        case 'product':
            return row.quotation_items?.[0]?.product_id || 'unknown';
        case 'product_category':
            return row.quotation_items?.[0]?.products?.category || 'Uncategorized';
        case 'time_period': {
            const date = new Date(row.created_at);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        case 'status':
            return row.status || 'unknown';
        case 'sector':
            return row.customers?.sector || 'Unknown';
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
            return row.profiles?.full_name || 'Unknown Rep';
        case 'customer':
            return row.customers?.company_name || 'Unknown Customer';
        case 'product':
            return row.quotation_items?.[0]?.products?.name || 'Unknown Product';
        case 'product_category':
            return row.quotation_items?.[0]?.products?.category || 'Uncategorized';
        case 'time_period': {
            const date = new Date(row.created_at);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        }
        case 'status':
            return formatStatus(row.status);
        case 'sector':
            return row.customers?.sector || 'Unknown Sector';
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
            const won = rows.filter(r => r.status === 'deal_won').length;
            return rows.length > 0 ? (won / rows.length) * 100 : 0;
        }

        case 'total_commission':
            // This would need commission data joined
            return 0;

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

        default:
            return 0;
    }
}

/**
 * Format status for display
 */
function formatStatus(status: string): string {
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
    };
    return statusMap[status] || status;
}

// =============================================================================
// Template Reports
// =============================================================================

export const REPORT_TEMPLATES: { name: string; description: string; config: ReportConfig }[] = [
    {
        name: 'Revenue by Sales Rep',
        description: 'Compare total revenue generated by each sales representative',
        config: {
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
];
