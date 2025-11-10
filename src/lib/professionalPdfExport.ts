import { supabase } from './supabase';

interface QuotationData {
  quotation_number: string;
  customer: any;
  items: any[];
  subtotal: number;
  discount_percentage?: number;
  discount_amount?: number;
  tax_percentage?: number;
  tax_amount?: number;
  total: number;
  notes?: string;
  terms_and_conditions?: string;
  created_at: string;
  valid_until?: string;
  status: string;
}

export const exportProfessionalQuotationPDF = async (quotation: QuotationData) => {
  const settings = await getSystemSettings();
  const htmlContent = generateProfessionalQuotationHTML(quotation, settings);

  // Try to open print window
  const printWindow = window.open('', '_blank', 'width=1200,height=800');

  if (!printWindow || printWindow.closed || typeof printWindow.closed === 'undefined') {
    // Popup was blocked - show detailed instructions
    const message = `Popup Blocked!

To export the PDF, please:

1. Click the icon in your address bar (usually on the right)
2. Select "Always allow popups from this site"
3. Click the Export button again

Alternatively:
• Chrome: Click the popup icon in the address bar
• Firefox: Click "Preferences" then "Show pop-ups for [site]"
• Safari: Go to Safari > Preferences > Websites > Pop-up Windows
• Edge: Click the popup icon in the address bar`;

    alert(message);

    // Log to console with clickable instructions
    console.warn('%c📄 PDF Export Blocked', 'color: #ea580c; font-size: 16px; font-weight: bold;');
    console.log('%cPopup was blocked by your browser. Please allow popups for this site to export PDFs.', 'font-size: 14px;');
    console.log('%cTo enable popups:', 'font-weight: bold; font-size: 14px;');
    console.log('1. Click the popup blocker icon in your address bar');
    console.log('2. Select "Always allow popups from this site"');
    console.log('3. Try exporting again');

    return false;
  }

  try {
    // Write content to the new window
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load, then trigger print
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 800);

    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF. Please try again.');
    printWindow.close();
    return false;
  }
};

const getSystemSettings = async () => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) throw error;

    return {
      company_name: data?.company_name || 'Special Offices',
      company_logo_url: data?.company_logo_url || '/logo.svg',
      default_terms: data?.default_terms_and_conditions || getDefaultTerms(),
    };
  } catch (error) {
    console.error('Error fetching system settings:', error);
    return {
      company_name: 'Special Offices',
      company_logo_url: '/logo.svg',
      default_terms: getDefaultTerms(),
    };
  }
};

const getDefaultTerms = () => {
  return `Terms and Conditions:

1. Payment Terms: Payment is due within 30 days of invoice date.
2. Validity: This quotation is valid for 30 days from the date of issue.
3. Delivery: Delivery times are estimated and may vary based on product availability.
4. Returns: Returns are accepted within 14 days of delivery in original condition.
5. Warranty: All products come with a standard manufacturer warranty.`;
};

const generateProfessionalQuotationHTML = (
  quotation: QuotationData,
  settings: any
): string => {
  const {
    quotation_number,
    customer,
    items,
    subtotal,
    discount_percentage,
    discount_amount,
    tax_percentage,
    tax_amount,
    total,
    notes,
    terms_and_conditions,
    created_at,
    valid_until,
    status,
  } = quotation;

  const validUntilDate = valid_until || getValidUntilDate(created_at);
  const terms = terms_and_conditions || settings.default_terms;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Quotation ${quotation_number}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          padding: 48px;
          color: #1e293b;
          line-height: 1.6;
          background: #ffffff;
          font-size: 14px;
        }

        .page-wrapper {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
        }

        /* Header Section */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 48px;
          padding-bottom: 24px;
          border-bottom: 3px solid #ea580c;
        }

        .company-section {
          flex: 1;
        }

        .company-logo {
          max-width: 180px;
          max-height: 80px;
          margin-bottom: 16px;
          object-fit: contain;
        }

        .company-name {
          color: #ea580c;
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }

        .company-tagline {
          color: #64748b;
          font-size: 14px;
          margin-bottom: 12px;
        }

        .company-contact {
          color: #475569;
          font-size: 13px;
          line-height: 1.8;
        }

        .company-contact p {
          margin-bottom: 4px;
        }

        /* Quotation Info */
        .quotation-info {
          text-align: right;
          flex-shrink: 0;
          min-width: 300px;
        }

        .quotation-title {
          color: #0f172a;
          font-size: 36px;
          font-weight: 700;
          margin-bottom: 16px;
          letter-spacing: -0.5px;
        }

        .quotation-meta {
          background: #f8fafc;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .quotation-meta-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 13px;
        }

        .quotation-meta-row .label {
          color: #64748b;
          font-weight: 500;
        }

        .quotation-meta-row .value {
          color: #0f172a;
          font-weight: 600;
        }

        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-draft { background: #f1f5f9; color: #475569; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-approved { background: #d1fae5; color: #065f46; }
        .status-rejected { background: #fee2e2; color: #991b1b; }

        /* Customer Information */
        .customer-section {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 32px;
          border: 1px solid #e2e8f0;
        }

        .customer-section h3 {
          color: #0f172a;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .customer-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .customer-detail {
          color: #475569;
          font-size: 14px;
        }

        .customer-detail strong {
          color: #0f172a;
          display: block;
          margin-bottom: 4px;
          font-weight: 600;
        }

        /* Items Table */
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 32px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          overflow: hidden;
        }

        .items-table thead {
          background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);
          color: white;
        }

        .items-table th {
          padding: 16px;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .items-table td {
          padding: 16px;
          border-bottom: 1px solid #e2e8f0;
          color: #475569;
          font-size: 14px;
        }

        .items-table tbody tr {
          background: white;
          transition: background 0.2s;
        }

        .items-table tbody tr:hover {
          background: #f8fafc;
        }

        .items-table tbody tr:last-child td {
          border-bottom: none;
        }

        .text-right {
          text-align: right;
        }

        .text-center {
          text-align: center;
        }

        .item-name {
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 4px;
        }

        .item-description {
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
        }

        /* Summary Section */
        .summary-section {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 32px;
        }

        .summary-box {
          width: 400px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 24px;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          font-size: 15px;
          color: #475569;
        }

        .summary-row .label {
          font-weight: 500;
        }

        .summary-row .amount {
          font-weight: 600;
          color: #0f172a;
        }

        .summary-row.discount .amount {
          color: #dc2626;
        }

        .summary-row.total {
          border-top: 3px solid #ea580c;
          margin-top: 12px;
          padding-top: 16px;
          font-size: 20px;
          font-weight: 700;
        }

        .summary-row.total .label {
          color: #0f172a;
        }

        .summary-row.total .amount {
          color: #ea580c;
        }

        /* Notes Section */
        .notes-section {
          background: #fef3c7;
          padding: 24px;
          border-left: 4px solid #f59e0b;
          border-radius: 8px;
          margin-bottom: 32px;
        }

        .notes-section h3 {
          color: #92400e;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .notes-section p {
          color: #78350f;
          font-size: 14px;
          line-height: 1.7;
        }

        /* Terms Section */
        .terms-section {
          background: #f8fafc;
          padding: 24px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          margin-bottom: 32px;
        }

        .terms-section h3 {
          color: #0f172a;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .terms-section p {
          color: #475569;
          font-size: 13px;
          line-height: 1.8;
          white-space: pre-line;
        }

        /* Footer */
        .footer {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 2px solid #e2e8f0;
          text-align: center;
        }

        .footer-message {
          color: #ea580c;
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .footer-details {
          color: #64748b;
          font-size: 12px;
          line-height: 1.6;
        }

        /* Print Styles */
        @media print {
          body {
            padding: 20px;
          }

          .no-print {
            display: none !important;
          }

          .items-table {
            box-shadow: none;
          }

          .page-wrapper {
            max-width: 100%;
          }

          .header {
            page-break-after: avoid;
          }

          .items-table thead {
            display: table-header-group;
          }

          .items-table tbody tr {
            page-break-inside: avoid;
          }
        }

        @page {
          margin: 1.5cm;
          size: A4;
        }
      </style>
    </head>
    <body>
      <div class="page-wrapper">
        <!-- Header -->
        <div class="header">
          <div class="company-section">
            <img src="${settings.company_logo_url}" alt="${settings.company_name}" class="company-logo" />
            <h1 class="company-name">${settings.company_name}</h1>
            <p class="company-tagline">Professional Business Solutions</p>
            <div class="company-contact">
              <p><strong>Email:</strong> info@specialoffices.com</p>
              <p><strong>Phone:</strong> +966 11 123 4567</p>
              <p><strong>Address:</strong> Riyadh, Saudi Arabia</p>
            </div>
          </div>

          <div class="quotation-info">
            <h2 class="quotation-title">QUOTATION</h2>
            <div class="quotation-meta">
              <div class="quotation-meta-row">
                <span class="label">Number:</span>
                <span class="value">${quotation_number}</span>
              </div>
              <div class="quotation-meta-row">
                <span class="label">Date:</span>
                <span class="value">${formatDate(created_at)}</span>
              </div>
              <div class="quotation-meta-row">
                <span class="label">Valid Until:</span>
                <span class="value">${formatDate(validUntilDate)}</span>
              </div>
              <div class="quotation-meta-row">
                <span class="label">Status:</span>
                <span class="value">
                  <span class="status-badge status-${status}">${status.toUpperCase()}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Customer Information -->
        <div class="customer-section">
          <h3>Bill To:</h3>
          <div class="customer-details">
            <div class="customer-detail">
              <strong>Company:</strong>
              ${customer?.company_name || 'N/A'}
            </div>
            <div class="customer-detail">
              <strong>Contact Person:</strong>
              ${customer?.contact_person || customer?.contact_name || 'N/A'}
            </div>
            <div class="customer-detail">
              <strong>Email:</strong>
              ${customer?.email || 'N/A'}
            </div>
            <div class="customer-detail">
              <strong>Phone:</strong>
              ${customer?.phone || 'N/A'}
            </div>
            ${
              customer?.address
                ? `
            <div class="customer-detail" style="grid-column: 1 / -1;">
              <strong>Address:</strong>
              ${customer.address}
            </div>
            `
                : ''
            }
          </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 5%;">#</th>
              <th style="width: 35%;">Item Description</th>
              <th class="text-center" style="width: 10%;">Quantity</th>
              <th class="text-right" style="width: 15%;">Unit Price</th>
              <th class="text-center" style="width: 10%;">Discount</th>
              <th class="text-right" style="width: 15%;">Subtotal</th>
              <th class="text-right" style="width: 15%;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(items || [])
              .map(
                (item: any, index: number) => `
              <tr>
                <td class="text-center">${index + 1}</td>
                <td>
                  <div class="item-name">${item.product?.name || item.item_description || 'Custom Item'}</div>
                  ${
                    item.product?.description || item.specifications
                      ? `<div class="item-description">${item.product?.description || (typeof item.specifications === 'string' ? item.specifications : JSON.stringify(item.specifications))}</div>`
                      : ''
                  }
                </td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">${item.unit_price != null && !isNaN(Number(item.unit_price)) ? `SAR ${formatNumber(item.unit_price)}` : '<span style="color: #2563eb; font-size: 11px; font-weight: 600;">Pending</span>'}</td>
                <td class="text-center">${item.discount_percentage || 0}%</td>
                <td class="text-right">${item.unit_price != null ? `SAR ${formatNumber(item.quantity * item.unit_price)}` : '<span style="color: #2563eb; font-size: 11px;">Pending</span>'}</td>
                <td class="text-right"><strong>${item.line_total != null && !isNaN(Number(item.line_total)) ? `SAR ${formatNumber(item.line_total)}` : '<span style="color: #2563eb; font-size: 11px;">Awaiting Price</span>'}</strong></td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <!-- Summary -->
        <div class="summary-section">
          <div class="summary-box">
            <div class="summary-row">
              <span class="label">Subtotal:</span>
              <span class="amount">SAR ${formatNumber(subtotal || 0)}</span>
            </div>
            ${
              discount_percentage && discount_amount
                ? `
            <div class="summary-row discount">
              <span class="label">Discount (${discount_percentage}%):</span>
              <span class="amount">- SAR ${formatNumber(discount_amount)}</span>
            </div>
            `
                : ''
            }
            <div class="summary-row">
              <span class="label">Tax (${tax_percentage || 15}%):</span>
              <span class="amount">SAR ${formatNumber(tax_amount || 0)}</span>
            </div>
            <div class="summary-row total">
              <span class="label">Total Amount:</span>
              <span class="amount">SAR ${formatNumber(total || 0)}</span>
            </div>
          </div>
        </div>

        ${
          notes
            ? `
        <!-- Notes -->
        <div class="notes-section">
          <h3>Special Notes:</h3>
          <p>${notes}</p>
        </div>
        `
            : ''
        }

        <!-- Terms and Conditions -->
        <div class="terms-section">
          <h3>Terms & Conditions:</h3>
          <p>${terms}</p>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p class="footer-message">Thank you for your business!</p>
          <div class="footer-details">
            <p>This quotation is computer-generated and valid for 30 days from the date of issue.</p>
            <p>For any questions, please contact us at info@specialoffices.com</p>
            <p>© ${new Date().getFullYear()} ${settings.company_name}. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const getValidUntilDate = (createdAt: string): string => {
  const date = new Date(createdAt);
  date.setDate(date.getDate() + 30);
  return date.toISOString();
};
