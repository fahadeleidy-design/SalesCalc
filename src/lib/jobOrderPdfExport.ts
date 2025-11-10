import { supabase } from './supabase';

interface JobOrderData {
  job_order_number: string;
  quotation_number: string;
  customer: any;
  items: any[];
  priority: string;
  due_date?: string;
  production_notes?: string;
  generated_at: string;
  status: string;
}

/**
 * Export Job Order as PDF (NO PRICING INFORMATION)
 * For factory/production use only - contains technical specifications
 */
export const exportJobOrderPDF = async (jobOrder: JobOrderData) => {
  const settings = await getSystemSettings();
  const htmlContent = generateJobOrderHTML(jobOrder, settings);

  // Try to open print window
  const printWindow = window.open('', '_blank', 'width=1200,height=800');

  if (!printWindow || printWindow.closed || typeof printWindow.closed === 'undefined') {
    // Popup was blocked
    const message = `Popup Blocked!

To export the Job Order PDF, please:

1. Click the popup icon in your address bar (usually on the right)
2. Select "Always allow popups from this site"
3. Click the Export button again`;

    alert(message);

    console.warn('%c📄 Job Order PDF Export Blocked', 'color: #ea580c; font-size: 16px; font-weight: bold;');
    console.log('%cPlease allow popups for this site to export Job Order PDFs.', 'font-size: 14px;');

    return false;
  }

  try {
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 800);

    return true;
  } catch (error) {
    console.error('Error generating Job Order PDF:', error);
    alert('Failed to generate Job Order PDF. Please try again.');
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
      .maybeSingle();

    if (error) throw error;

    return {
      company_name: data?.company_name || 'Special Offices',
      company_logo_url: data?.company_logo_url || '/logo.svg',
    };
  } catch (error) {
    console.error('Error fetching system settings:', error);
    return {
      company_name: 'Special Offices',
      company_logo_url: '/logo.svg',
    };
  }
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getPriorityBadge = (priority: string): string => {
  const badges = {
    urgent: '<span style="background: #dc2626; color: white; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 700;">🔴 URGENT</span>',
    high: '<span style="background: #f59e0b; color: white; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 700;">🟠 HIGH PRIORITY</span>',
    normal: '<span style="background: #3b82f6; color: white; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 700;">NORMAL</span>',
    low: '<span style="background: #64748b; color: white; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 700;">LOW PRIORITY</span>',
  };
  return badges[priority as keyof typeof badges] || badges.normal;
};

const generateJobOrderHTML = (jobOrder: JobOrderData, settings: any): string => {
  const {
    job_order_number,
    quotation_number,
    customer,
    items,
    priority,
    due_date,
    production_notes,
    generated_at,
    status,
  } = jobOrder;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Job Order ${job_order_number}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
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
          margin-bottom: 32px;
          padding-bottom: 20px;
          border-bottom: 4px solid #dc2626;
        }

        .company-section {
          flex: 1;
        }

        .company-logo {
          max-width: 160px;
          max-height: 70px;
          margin-bottom: 12px;
          object-fit: contain;
        }

        .company-name {
          color: #dc2626;
          font-size: 28px;
          font-weight: 800;
          margin-bottom: 4px;
          letter-spacing: -0.5px;
        }

        .job-order-info {
          text-align: right;
          background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
          color: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
        }

        .job-order-title {
          font-size: 28px;
          font-weight: 800;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .job-order-meta {
          background: rgba(255, 255, 255, 0.1);
          padding: 12px;
          border-radius: 8px;
          backdrop-filter: blur(10px);
        }

        .job-order-meta-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 13px;
        }

        .job-order-meta-row .label {
          font-weight: 500;
          opacity: 0.9;
        }

        .job-order-meta-row .value {
          font-weight: 700;
          font-size: 14px;
        }

        /* Alert Box */
        .alert-box {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 3px solid #f59e0b;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
        }

        .alert-title {
          color: #92400e;
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .alert-content {
          color: #78350f;
          font-size: 15px;
          font-weight: 600;
          line-height: 1.6;
        }

        /* Customer Section */
        .customer-section {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 24px;
          border: 2px solid #e2e8f0;
        }

        .customer-section h3 {
          color: #0f172a;
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 12px;
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
          margin-bottom: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          overflow: hidden;
        }

        .items-table thead {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          color: white;
        }

        .items-table th {
          padding: 16px;
          text-align: left;
          font-weight: 700;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .items-table td {
          padding: 16px;
          border-bottom: 1px solid #e2e8f0;
          color: #475569;
          font-size: 13px;
          vertical-align: top;
        }

        .items-table tbody tr {
          background: white;
        }

        .items-table tbody tr:nth-child(even) {
          background: #f8fafc;
        }

        .items-table tbody tr:last-child td {
          border-bottom: none;
        }

        .text-center {
          text-align: center;
        }

        .item-name {
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 6px;
          font-size: 14px;
        }

        .custom-badge {
          display: inline-block;
          background: #fef3c7;
          color: #92400e;
          padding: 3px 10px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 700;
          margin-top: 4px;
          border: 1px solid #fcd34d;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .spec-box {
          margin-top: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          border-left: 4px solid;
        }

        .spec-label {
          font-weight: 700;
          font-size: 11px;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .spec-content {
          font-size: 12px;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        /* Production Notes */
        .production-notes {
          background: #fef3c7;
          border: 3px solid #f59e0b;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .production-notes h3 {
          color: #92400e;
          font-size: 16px;
          font-weight: 800;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .production-notes p {
          color: #78350f;
          font-size: 14px;
          line-height: 1.8;
          white-space: pre-wrap;
        }

        /* Footer */
        .footer {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 3px solid #e2e8f0;
          text-align: center;
        }

        .footer-warning {
          color: #dc2626;
          font-size: 16px;
          font-weight: 800;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
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

          .page-wrapper {
            max-width: 100%;
          }

          .items-table {
            box-shadow: none;
          }

          .items-table tbody tr {
            page-break-inside: avoid;
          }

          .header {
            page-break-after: avoid;
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
            <p style="color: #64748b; font-size: 13px; font-weight: 500;">Production & Manufacturing</p>
          </div>

          <div class="job-order-info">
            <h2 class="job-order-title">Job Order</h2>
            <div class="job-order-meta">
              <div class="job-order-meta-row">
                <span class="label">Job Order #:</span>
                <span class="value">${job_order_number}</span>
              </div>
              <div class="job-order-meta-row">
                <span class="label">Reference Quote:</span>
                <span class="value">${quotation_number}</span>
              </div>
              <div class="job-order-meta-row">
                <span class="label">Generated:</span>
                <span class="value">${formatDate(generated_at)}</span>
              </div>
              ${due_date ? `
              <div class="job-order-meta-row">
                <span class="label">Due Date:</span>
                <span class="value">${formatDate(due_date)}</span>
              </div>
              ` : ''}
              <div class="job-order-meta-row">
                <span class="label">Priority:</span>
                <span class="value">${getPriorityBadge(priority)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Confidentiality Alert -->
        <div class="alert-box">
          <div class="alert-title">⚠️ Production Document - No Pricing Information</div>
          <div class="alert-content">
            This is a PRODUCTION COPY for factory use only. All pricing information has been removed.
            For commercial details, refer to the original quotation.
          </div>
        </div>

        <!-- Customer Information -->
        <div class="customer-section">
          <h3>📋 Customer Information</h3>
          <div class="customer-details">
            <div class="customer-detail">
              <strong>Customer Name:</strong>
              ${customer?.company_name || customer?.name || 'N/A'}
            </div>
            <div class="customer-detail">
              <strong>Contact Person:</strong>
              ${customer?.contact_person || 'N/A'}
            </div>
            <div class="customer-detail">
              <strong>Email:</strong>
              ${customer?.email || 'N/A'}
            </div>
            <div class="customer-detail">
              <strong>Phone:</strong>
              ${customer?.phone || 'N/A'}
            </div>
            ${customer?.address ? `
            <div class="customer-detail" style="grid-column: 1 / -1;">
              <strong>Delivery Address:</strong>
              ${customer.address}
            </div>
            ` : ''}
          </div>
        </div>

        <!-- Production Notes (if any) -->
        ${production_notes ? `
        <div class="production-notes">
          <h3>🔧 Production Notes</h3>
          <p>${production_notes}</p>
        </div>
        ` : ''}

        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 5%;">#</th>
              <th style="width: 50%;">Item & Specifications</th>
              <th class="text-center" style="width: 15%;">Quantity</th>
              <th style="width: 30%;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${(items || [])
              .map((item: any, index: number) => {
                const isCustomItem = item.is_custom === true;
                const hasModifications = item.modifications && item.modifications.trim().length > 0;
                const hasNotes = item.notes && item.notes.trim().length > 0;
                const hasSpecs = item.specifications &&
                  JSON.stringify(item.specifications) !== '{}' &&
                  JSON.stringify(item.specifications).trim().length > 2;

                let descriptionHTML = '';

                // Item title
                const itemTitle = item.item_description ||
                  (isCustomItem ? (item.custom_description || 'Custom Item') : (item.product?.name || 'Item'));

                descriptionHTML += `<div class="item-name">${itemTitle}</div>`;

                // Custom badge
                if (isCustomItem) {
                  descriptionHTML += `<div class="custom-badge">⭐ Custom Item</div>`;
                }

                // Product description
                if (!isCustomItem && item.product?.description) {
                  descriptionHTML += `<div style="color: #64748b; font-size: 12px; margin-top: 4px;">${item.product.description}</div>`;
                }

                // Modifications
                if (hasModifications) {
                  descriptionHTML += `
                    <div class="spec-box" style="background: #fef3c7; border-left-color: #f59e0b;">
                      <div class="spec-label" style="color: #92400e;">🔧 Modifications:</div>
                      <div class="spec-content" style="color: #78350f;">${item.modifications.replace(/\n/g, '<br>')}</div>
                    </div>
                  `;
                }

                // Specifications
                if (hasSpecs) {
                  const specs = typeof item.specifications === 'string'
                    ? item.specifications
                    : JSON.stringify(item.specifications, null, 2)
                        .replace(/[{}"]/g, '')
                        .replace(/,/g, '\n')
                        .trim();

                  if (specs) {
                    descriptionHTML += `
                      <div class="spec-box" style="background: #dbeafe; border-left-color: #3b82f6;">
                        <div class="spec-label" style="color: #1e40af;">📋 Technical Specifications:</div>
                        <div class="spec-content" style="color: #1e3a8a;">${specs}</div>
                      </div>
                    `;
                  }
                }

                // Production notes
                if (hasNotes) {
                  descriptionHTML += `
                    <div class="spec-box" style="background: #f3f4f6; border-left-color: #6b7280;">
                      <div class="spec-label" style="color: #374151;">📝 Production Notes:</div>
                      <div class="spec-content" style="color: #1f2937;">${item.notes.replace(/\n/g, '<br>')}</div>
                    </div>
                  `;
                }

                // Status indicator
                const statusBadges = {
                  pending: '<span style="background: #fef3c7; color: #92400e; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; border: 2px solid #fcd34d;">⏳ PENDING</span>',
                  in_production: '<span style="background: #dbeafe; color: #1e40af; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; border: 2px solid #93c5fd;">🔨 IN PRODUCTION</span>',
                  completed: '<span style="background: #dcfce7; color: #166534; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; border: 2px solid #86efac;">✅ COMPLETED</span>',
                  on_hold: '<span style="background: #fee2e2; color: #991b1b; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; border: 2px solid #fca5a5;">⏸️ ON HOLD</span>',
                };

                const statusBadge = statusBadges[item.status as keyof typeof statusBadges] || statusBadges.pending;

                return `
              <tr>
                <td class="text-center" style="font-weight: 700; font-size: 16px; color: #0f172a;">${index + 1}</td>
                <td>${descriptionHTML}</td>
                <td class="text-center">
                  <div style="background: #dbeafe; color: #1e40af; padding: 8px 16px; border-radius: 8px; font-size: 18px; font-weight: 800; border: 2px solid #3b82f6;">
                    ${item.quantity}
                  </div>
                  ${item.completed_quantity > 0 ? `
                    <div style="margin-top: 8px; font-size: 11px; color: #059669; font-weight: 600;">
                      Completed: ${item.completed_quantity}
                    </div>
                  ` : ''}
                </td>
                <td class="text-center">${statusBadge}</td>
              </tr>
            `;
              })
              .join('')}
          </tbody>
        </table>

        <!-- Footer -->
        <div class="footer">
          <div class="footer-warning">🔒 Confidential Production Document</div>
          <div class="footer-details">
            <p><strong>This document is for internal production use only.</strong></p>
            <p>Generated by ${settings.company_name} • Job Order System</p>
            <p>For questions or clarifications, contact the production manager.</p>
            <p style="margin-top: 12px; color: #dc2626; font-weight: 600;">
              ⚠️ No pricing or commercial information is included in this document.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};
