import * as XLSX from 'xlsx';
import type { Quotation } from '../hooks/useQuotations';
import { format } from 'date-fns';

/**
 * Export quotations to Excel file
 */
export function exportQuotationsToExcel(quotations: Quotation[], filename?: string) {
  // Prepare data for export
  const data = quotations.map((q) => ({
    'Quotation Number': q.quotation_number,
    'Customer Name': q.customer_name,
    'Contact Person': q.contact_person,
    'Email': q.email,
    'Phone': q.phone,
    'Subtotal': q.subtotal,
    'Tax Rate': `${q.tax_rate}%`,
    'Tax Amount': q.tax_amount,
    'Discount': `${q.discount_percentage}%`,
    'Discount Amount': q.discount_amount,
    'Total': q.net_total,
    'Status': q.status,
    'Approval Status': q.approval_status,
    'Created By': q.created_by,
    'Created At': format(new Date(q.created_at), 'yyyy-MM-dd HH:mm:ss'),
    'Updated At': format(new Date(q.updated_at), 'yyyy-MM-dd HH:mm:ss'),
  }));

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths
  const columnWidths = [
    { wch: 20 }, // Quotation Number
    { wch: 25 }, // Customer Name
    { wch: 20 }, // Contact Person
    { wch: 30 }, // Email
    { wch: 15 }, // Phone
    { wch: 12 }, // Subtotal
    { wch: 10 }, // Tax Rate
    { wch: 12 }, // Tax Amount
    { wch: 10 }, // Discount
    { wch: 15 }, // Discount Amount
    { wch: 12 }, // Total
    { wch: 12 }, // Status
    { wch: 15 }, // Approval Status
    { wch: 20 }, // Created By
    { wch: 20 }, // Created At
    { wch: 20 }, // Updated At
  ];
  worksheet['!cols'] = columnWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Quotations');

  // Generate filename
  const exportFilename = filename || `quotations_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`;

  // Download file
  XLSX.writeFile(workbook, exportFilename);
}

/**
 * Export single quotation with items to Excel
 */
export function exportQuotationDetailsToExcel(quotation: Quotation, filename?: string) {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Quotation Summary
  const summaryData = [
    ['Quotation Number', quotation.quotation_number],
    ['Customer Name', quotation.customer_name],
    ['Contact Person', quotation.contact_person],
    ['Email', quotation.email],
    ['Phone', quotation.phone],
    [''],
    ['Subtotal', quotation.subtotal],
    ['Tax Rate', `${quotation.tax_rate}%`],
    ['Tax Amount', quotation.tax_amount],
    ['Discount', `${quotation.discount_percentage}%`],
    ['Discount Amount', quotation.discount_amount],
    ['Total', quotation.net_total],
    [''],
    ['Status', quotation.status],
    ['Approval Status', quotation.approval_status],
    ['Created By', quotation.created_by],
    ['Created At', format(new Date(quotation.created_at), 'yyyy-MM-dd HH:mm:ss')],
    ['Updated At', format(new Date(quotation.updated_at), 'yyyy-MM-dd HH:mm:ss')],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Sheet 2: Line Items
  const itemsData = quotation.items.map((item: any, index: number) => ({
    '#': index + 1,
    'Product/Service': item.name || item.product_name,
    'Description': item.description || '',
    'Quantity': item.quantity,
    'Unit': item.unit || 'pcs',
    'Unit Price': item.unit_price,
    'Discount %': item.discount_percentage || 0,
    'Total': item.total,
  }));

  const itemsSheet = XLSX.utils.json_to_sheet(itemsData);
  itemsSheet['!cols'] = [
    { wch: 5 },  // #
    { wch: 30 }, // Product/Service
    { wch: 40 }, // Description
    { wch: 10 }, // Quantity
    { wch: 10 }, // Unit
    { wch: 12 }, // Unit Price
    { wch: 12 }, // Discount %
    { wch: 12 }, // Total
  ];
  XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Line Items');

  // Sheet 3: Approval History (if available)
  if (quotation.approval_history && quotation.approval_history.length > 0) {
    const approvalData = quotation.approval_history.map((approval: any) => ({
      'Approver': approval.approver_name,
      'Action': approval.action,
      'Comments': approval.comments || '',
      'Date': format(new Date(approval.created_at), 'yyyy-MM-dd HH:mm:ss'),
    }));

    const approvalSheet = XLSX.utils.json_to_sheet(approvalData);
    approvalSheet['!cols'] = [
      { wch: 25 }, // Approver
      { wch: 15 }, // Action
      { wch: 50 }, // Comments
      { wch: 20 }, // Date
    ];
    XLSX.utils.book_append_sheet(workbook, approvalSheet, 'Approval History');
  }

  // Generate filename
  const exportFilename = filename || `quotation_${quotation.quotation_number}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

  // Download file
  XLSX.writeFile(workbook, exportFilename);
}

/**
 * Export analytics data to Excel
 */
export function exportAnalyticsToExcel(
  quotations: Quotation[],
  dateRange: string,
  filename?: string
) {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Summary Metrics
  const totalValue = quotations.reduce((sum, q) => sum + q.net_total, 0);
  const approved = quotations.filter(q => q.approval_status === 'approved').length;
  const rejected = quotations.filter(q => q.approval_status === 'rejected').length;
  const pending = quotations.filter(q => q.approval_status === 'pending').length;
  const avgValue = quotations.length > 0 ? totalValue / quotations.length : 0;
  const winRate = quotations.length > 0 ? (approved / quotations.length) * 100 : 0;

  const metricsData = [
    ['Metric', 'Value'],
    ['Date Range', dateRange],
    ['Total Quotations', quotations.length],
    ['Total Value', totalValue],
    ['Average Value', avgValue],
    [''],
    ['Approved', approved],
    ['Rejected', rejected],
    ['Pending', pending],
    ['Win Rate', `${winRate.toFixed(2)}%`],
  ];

  const metricsSheet = XLSX.utils.aoa_to_sheet(metricsData);
  metricsSheet['!cols'] = [{ wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, metricsSheet, 'Summary');

  // Sheet 2: Quotations List
  const quotationsData = quotations.map((q) => ({
    'Quotation Number': q.quotation_number,
    'Customer': q.customer_name,
    'Total': q.net_total,
    'Status': q.status,
    'Approval Status': q.approval_status,
    'Created': format(new Date(q.created_at), 'yyyy-MM-dd'),
  }));

  const quotationsSheet = XLSX.utils.json_to_sheet(quotationsData);
  quotationsSheet['!cols'] = [
    { wch: 20 },
    { wch: 30 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(workbook, quotationsSheet, 'Quotations');

  // Sheet 3: Customer Analysis
  const customerMap = new Map<string, { count: number; total: number }>();
  quotations.forEach(q => {
    const current = customerMap.get(q.customer_name) || { count: 0, total: 0 };
    customerMap.set(q.customer_name, {
      count: current.count + 1,
      total: current.total + q.net_total,
    });
  });

  const customerData = Array.from(customerMap.entries())
    .map(([name, data]) => ({
      'Customer': name,
      'Quotations': data.count,
      'Total Value': data.total,
      'Average Value': data.total / data.count,
    }))
    .sort((a, b) => b['Total Value'] - a['Total Value']);

  const customerSheet = XLSX.utils.json_to_sheet(customerData);
  customerSheet['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, customerSheet, 'Customer Analysis');

  // Generate filename
  const exportFilename = filename || `analytics_${dateRange}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

  // Download file
  XLSX.writeFile(workbook, exportFilename);
}

/**
 * Export customers to Excel
 */
export function exportCustomersToExcel(customers: any[], filename?: string) {
  const data = customers.map((c) => ({
    'Name': c.name,
    'Contact Person': c.contact_person,
    'Email': c.email,
    'Phone': c.phone,
    'Address': c.address,
    'City': c.city,
    'Country': c.country,
    'Tax ID': c.tax_id,
    'Payment Terms': c.payment_terms,
    'Credit Limit': c.credit_limit,
    'Status': c.status,
    'Created At': format(new Date(c.created_at), 'yyyy-MM-dd'),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 30 },
    { wch: 25 },
    { wch: 30 },
    { wch: 15 },
    { wch: 40 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 15 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

  const exportFilename = filename || `customers_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(workbook, exportFilename);
}

/**
 * Export products to Excel
 */
export function exportProductsToExcel(products: any[], filename?: string) {
  const data = products.map((p) => ({
    'SKU': p.sku,
    'Name': p.name,
    'Description': p.description,
    'Category': p.category,
    'Unit Price': p.unit_price,
    'Cost Price': p.cost_price,
    'Unit': p.unit,
    'Stock Quantity': p.stock_quantity,
    'Min Stock Level': p.min_stock_level,
    'Tax Rate': `${p.tax_rate}%`,
    'Status': p.status,
    'Created At': format(new Date(p.created_at), 'yyyy-MM-dd'),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 15 },
    { wch: 30 },
    { wch: 50 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
    { wch: 10 },
    { wch: 12 },
    { wch: 15 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

  const exportFilename = filename || `products_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(workbook, exportFilename);
}
