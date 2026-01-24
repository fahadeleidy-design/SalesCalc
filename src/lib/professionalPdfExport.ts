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
  title?: string;
  payment_terms?: string;
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
    const query = supabase
      .from('system_settings')
      .select('*')
      .limit(1) as any;

    const { data: results, error } = await query;
    const data = results?.[0];

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
          padding: 40px;
          color: #1e293b;
          line-height: 1.5;
          background: #ffffff;
          font-size: 12px;
        }

        .page-wrapper {
          max-width: 1000px;
          margin: 0 auto;
        }

        /* Top Accent Bar */
        .accent-bar {
          height: 8px;
          background: linear-gradient(to right, #ea580c, #f97316);
          border-radius: 4px;
          margin-bottom: 30px;
        }

        /* Header Section */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
        }

        .company-info {
          flex: 1;
        }

        .logo {
          height: 60px;
          margin-bottom: 15px;
        }

        .company-name {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 5px;
        }

        .company-meta {
          color: #64748b;
          font-size: 11px;
          line-height: 1.6;
        }

        .quote-header {
          text-align: right;
        }

        .quote-title {
          font-size: 32px;
          font-weight: 800;
          color: #ea580c;
          letter-spacing: -1px;
          margin-bottom: 5px;
        }

        .quote-arabic-title {
          font-size: 18px;
          color: #94a3b8;
          font-weight: 500;
          margin-bottom: 15px;
        }

        .quote-meta-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 15px;
          min-width: 250px;
        }

        .meta-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .meta-row:last-child { margin-bottom: 0; }

        .meta-label {
          color: #64748b;
          font-weight: 600;
        }

        .meta-value {
          color: #0f172a;
          font-weight: 700;
        }

        /* Address Section */
        .address-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-bottom: 40px;
        }

        .address-card {
          padding: 20px;
          background: #f1f5f9;
          border-radius: 12px;
          border-left: 4px solid #ea580c;
        }

        .address-label {
          font-size: 10px;
          font-weight: 800;
          color: #ea580c;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
        }

        .address-name {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 5px;
        }

        .address-details {
          font-size: 11px;
          color: #475569;
          line-height: 1.6;
        }

        /* Table Section */
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }

        .items-table th {
          background: #0f172a;
          color: white;
          padding: 12px 15px;
          text-align: left;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .items-table th.right { text-align: right; }
        .items-table th.center { text-align: center; }

        .items-table td {
          padding: 15px;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: top;
        }

        .item-row:nth-child(even) { background: #fafafa; }

        .item-name {
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 4px;
        }

        .item-spec {
          font-size: 10px;
          color: #64748b;
          margin-top: 5px;
          padding: 5px 8px;
          background: #f8fafc;
          border-radius: 4px;
          border: 1px solid #f1f5f9;
        }

        /* Summary Section */
        .summary-container {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
        }

        .payment-terms {
          flex: 1;
          margin-right: 40px;
          padding: 20px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .payment-title {
          font-size: 11px;
          font-weight: 800;
          color: #0f172a;
          text-transform: uppercase;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
        }

        .payment-text {
          font-size: 11px;
          color: #475569;
        }

        .totals-box {
          width: 320px;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 13px;
        }

        .total-row.grand-total {
          margin-top: 10px;
          padding-top: 15px;
          border-top: 2px solid #0f172a;
          font-size: 18px;
          font-weight: 800;
          color: #ea580c;
        }

        /* Signature Section */
        .signature-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          margin-top: 60px;
          page-break-inside: avoid;
        }

        .signature-line {
          border-top: 1px solid #cbd5e1;
          margin-top: 50px;
          padding-top: 10px;
          text-align: center;
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
        }

        /* Footer */
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #f1f5f9;
          text-align: center;
          color: #94a3b8;
          font-size: 10px;
        }

        @media print {
          body { padding: 0; }
          .page-wrapper { width: 100%; }
        }
      </style>
    </head>
    <body>
      <div class="page-wrapper">
        <div class="accent-bar"></div>

        <div class="header">
          <div class="company-info">
            <img src="${settings.company_logo_url}" alt="Logo" class="logo">
            <div class="company-name">${settings.company_name}</div>
            <div class="company-meta">
               Riyadh, Kingdom of Saudi Arabia<br>
              T: +966 11 123 4567 | E: sales@specialoffices.com<br>
              VAT ID: 310123456700003
            </div>
          </div>
          <div class="quote-header">
            <div class="quote-title">QUOTATION</div>
            <div class="quote-arabic-title">عرض سعر</div>
            <div class="quote-meta-box">
              <div class="meta-row">
                <span class="meta-label">Quote # / الرقم</span>
                <span class="meta-value">${quotation_number}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Date / التاريخ</span>
                <span class="meta-value">${formatDate(created_at)}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Valid Until / صالح لغاية</span>
                <span class="meta-value">${formatDate(validUntilDate)}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="address-grid">
          <div class="address-card">
            <div class="address-label">
              <span>Bill To</span>
              <span>فاتورة إلى</span>
            </div>
            <div class="address-name">${customer?.company_name || 'Valued Customer'}</div>
            <div class="address-details">
              Attn: ${customer?.contact_person || 'N/A'}<br>
              ${customer?.address || ''}<br>
              ${customer?.phone ? `T: ${customer.phone}` : ''}<br>
              ${customer?.email ? `E: ${customer.email}` : ''}
            </div>
          </div>
          <div class="address-card" style="border-left-color: #0f172a;">
            <div class="address-label" style="color: #0f172a;">
              <span>Project Details</span>
              <span>تفاصيل المشروع</span>
            </div>
            <div class="address-name">${quotation.title || 'General Furniture Supply'}</div>
            <div class="address-details">
              Status: ${status.toUpperCase()}<br>
              Prepared By: Special Offices Sales Team
            </div>
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 55px">#</th>
              <th>Item & Description / الصنف والبيان</th>
              <th class="center" style="width: 80px">Qty / الكمية</th>
              <th class="right" style="width: 120px">Unit Price / السعر</th>
              <th class="right" style="width: 120px">Total / الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${(items || []).map((item: any, idx: number) => `
              <tr class="item-row">
                <td class="center">${idx + 1}</td>
                <td>
                  <div class="item-name">${item.is_custom ? item.custom_description : (item.product?.name || 'Item')}</div>
                  <div style="font-size: 10px; color: #64748b;">${item.product?.sku || 'N/A'}</div>
                  ${item.modifications ? `<div class="item-spec"><strong>Modifications:</strong> ${item.modifications}</div>` : ''}
                  ${item.notes ? `<div style="font-size: 10px; color: #94a3b8; margin-top: 3px; font-style: italic;">Note: ${item.notes}</div>` : ''}
                </td>
                <td class="center">${item.quantity}</td>
                <td class="right">${item.unit_price ? `SAR ${formatNumber(item.unit_price)}` : 'Pending'}</td>
                <td class="right"><strong>${item.line_total ? `SAR ${formatNumber(item.line_total)}` : 'Awaiting'}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary-container">
          <div class="payment-terms">
            <div class="payment-title">
              <span>Terms & Conditions</span>
              <span>الشروط والأحكام</span>
            </div>
            <div class="payment-text">
              ${terms.replace(/\n/g, '<br>')}
              ${notes ? `<br><br><strong>Note:</strong> ${notes}` : ''}
            </div>
          </div>
          <div class="totals-box">
            <div class="total-row">
              <span class="meta-label">Subtotal / الإجمالي الفرعي</span>
              <span class="meta-value">SAR ${formatNumber(subtotal)}</span>
            </div>
            ${discount_percentage ? `
              <div class="total-row" style="color: #dc2626;">
                <span class="meta-label">Discount (${discount_percentage}%) / الخصم</span>
                <span class="meta-value">- SAR ${formatNumber(discount_amount || 0)}</span>
              </div>
            ` : ''}
            <div class="total-row">
              <span class="meta-label">VAT (${tax_percentage}%) / الضريبة</span>
              <span class="meta-value">SAR ${formatNumber(tax_amount || 0)}</span>
            </div>
            <div class="total-row grand-total">
              <span>Total / الإجمالي</span>
              <span>SAR ${formatNumber(total)}</span>
            </div>
          </div>
        </div>

        <div class="signature-grid">
          <div>
            <div class="signature-line">
              Authorised Signature / التوقيع المعتمد<br>
              <strong>Special Offices Furniture Co.</strong>
            </div>
          </div>
          <div>
            <div class="signature-line" style="border-top-style: dashed;">
              Customer Acceptance / قبول العميل<br>
              (Sign & Rubber Stamp)
            </div>
          </div>
        </div>

        <div class="footer">
          Digitally generated by SalesCalc CRM. Valid for 30 days. All prices in Saudi Riyals (SAR).
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
