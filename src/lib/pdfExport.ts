export const exportQuotationToPDF = (quotation: any) => {
  const htmlContent = generateQuotationHTML(quotation);

  // Try to open print window with specific dimensions
  const printWindow = window.open('', '_blank', 'width=1200,height=800');

  if (!printWindow || printWindow.closed || typeof printWindow.closed === 'undefined') {
    // Popup was blocked - show detailed instructions
    const message = `Popup Blocked!

To export the PDF, please:

1. Click the popup icon in your address bar (usually on the right)
2. Select "Always allow popups from this site"
3. Click the Export button again

Browser-specific instructions:
• Chrome: Click the popup icon ⓧ in the address bar
• Firefox: Click "Preferences" then "Show pop-ups"
• Safari: Safari > Preferences > Websites > Pop-up Windows
• Edge: Click the popup icon in the address bar`;

    alert(message);

    // Log to console
    console.warn('%c📄 PDF Export Blocked', 'color: #ea580c; font-size: 16px; font-weight: bold;');
    console.log('%cPlease allow popups for this site to export PDFs.', 'font-size: 14px;');

    return false;
  }

  try {
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);

    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF. Please try again.');
    if (printWindow) printWindow.close();
    return false;
  }
};

const generateQuotationHTML = (quotation: any): string => {
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
    created_at,
  } = quotation;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Quotation ${quotation_number}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: Arial, sans-serif;
          padding: 40px;
          color: #1e293b;
          line-height: 1.6;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 3px solid #3b82f6;
        }
        .company {
          flex: 1;
        }
        .company h1 {
          color: #3b82f6;
          font-size: 28px;
          margin-bottom: 5px;
        }
        .company p {
          color: #64748b;
          font-size: 14px;
        }
        .quotation-info {
          text-align: right;
        }
        .quotation-info h2 {
          color: #1e293b;
          font-size: 24px;
          margin-bottom: 10px;
        }
        .quotation-info p {
          color: #64748b;
          font-size: 14px;
          margin-bottom: 5px;
        }
        .customer-info {
          background: #f1f5f9;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .customer-info h3 {
          color: #1e293b;
          font-size: 16px;
          margin-bottom: 10px;
        }
        .customer-info p {
          color: #475569;
          font-size: 14px;
          margin-bottom: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        thead {
          background: #3b82f6;
          color: white;
        }
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }
        th {
          font-weight: 600;
          font-size: 14px;
        }
        td {
          font-size: 14px;
          color: #475569;
        }
        tbody tr:hover {
          background: #f8fafc;
        }
        .text-right {
          text-align: right;
        }
        .summary {
          margin-left: auto;
          width: 350px;
          background: #f1f5f9;
          padding: 20px;
          border-radius: 8px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 14px;
        }
        .summary-row.total {
          border-top: 2px solid #3b82f6;
          margin-top: 10px;
          padding-top: 15px;
          font-size: 18px;
          font-weight: bold;
          color: #1e293b;
        }
        .notes {
          margin-top: 30px;
          padding: 20px;
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          border-radius: 4px;
        }
        .notes h3 {
          color: #92400e;
          font-size: 16px;
          margin-bottom: 10px;
        }
        .notes p {
          color: #78350f;
          font-size: 14px;
        }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          color: #94a3b8;
          font-size: 12px;
        }
        @media print {
          body {
            padding: 20px;
          }
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company">
          <h1>Special Offices</h1>
          <p>Professional Quotation Management</p>
          <p>Email: sales@specialoffices.com</p>
          <p>Phone: +1 (555) 123-4567</p>
        </div>
        <div class="quotation-info">
          <h2>QUOTATION</h2>
          <p><strong>Number:</strong> ${quotation_number}</p>
          <p><strong>Date:</strong> ${new Date(created_at).toLocaleDateString()}</p>
          <p><strong>Valid Until:</strong> ${getValidUntilDate(created_at)}</p>
        </div>
      </div>

      <div class="customer-info">
        <h3>Bill To:</h3>
        <p><strong>${customer?.company_name || 'N/A'}</strong></p>
        <p>${customer?.contact_name || ''}</p>
        <p>${customer?.email || ''}</p>
        <p>${customer?.phone || ''}</p>
        ${customer?.address ? `<p>${customer.address}</p>` : ''}
      </div>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Description</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Unit Price</th>
            <th class="text-right">Discount</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${(items || [])
            .map(
              (item: any) => `
            <tr>
              <td>${item.product?.name || item.item_description || 'N/A'}</td>
              <td>${item.product?.description || item.specifications ? JSON.stringify(item.specifications) : '-'}</td>
              <td class="text-right">${item.quantity}</td>
              <td class="text-right">$${Number(item.price).toFixed(2)}</td>
              <td class="text-right">${item.discount_percentage || 0}%</td>
              <td class="text-right">$${Number(item.line_total).toFixed(2)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div class="summary">
        <div class="summary-row">
          <span>Subtotal:</span>
          <span>$${Number(subtotal || 0).toFixed(2)}</span>
        </div>
        ${
          discount_percentage
            ? `
          <div class="summary-row">
            <span>Discount (${discount_percentage}%):</span>
            <span>-$${Number(discount_amount || 0).toFixed(2)}</span>
          </div>
        `
            : ''
        }
        <div class="summary-row">
          <span>Tax (${tax_percentage || 15}%):</span>
          <span>$${Number(tax_amount || 0).toFixed(2)}</span>
        </div>
        <div class="summary-row total">
          <span>Total:</span>
          <span>$${Number(total || 0).toFixed(2)}</span>
        </div>
      </div>

      ${
        notes
          ? `
        <div class="notes">
          <h3>Notes / Terms & Conditions:</h3>
          <p>${notes}</p>
        </div>
      `
          : ''
      }

      <div class="footer">
        <p>Thank you for your business!</p>
        <p>This quotation is valid for 30 days from the date of issue.</p>
        <p>Generated by Special Offices Quotation Management System</p>
      </div>
    </body>
    </html>
  `;
};

const getValidUntilDate = (createdAt: string): string => {
  const date = new Date(createdAt);
  date.setDate(date.getDate() + 30);
  return date.toLocaleDateString();
};
