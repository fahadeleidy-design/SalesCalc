import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from './currencyUtils';

interface QuotationData {
  quotation_number: string;
  title: string;
  created_at: string;
  valid_until: string | null;
  status: string;
  customer: {
    company_name: string;
    contact_person: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
  };
  sales_rep: {
    full_name: string;
    email: string | null;
  };
  items: Array<{
    product?: { name: string; sku: string };
    custom_description?: string | null;
    is_custom: boolean;
    quantity: number;
    unit_price: number;
    discount_percentage: number;
    line_total: number;
  }>;
  subtotal: number;
  discount_percentage: number;
  discount_amount: number;
  tax_percentage: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  terms_and_conditions: string | null;
}

export async function generateQuotationPDF(
  quotation: QuotationData,
  companyName?: string,
  logoUrl?: string | null
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Header - Company Logo Area
  doc.setFillColor(249, 115, 22); // Orange color
  doc.rect(0, 0, pageWidth, 15, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName || 'SPECIAL OFFICES', pageWidth / 2, 10, { align: 'center' });

  // Add logo if provided
  if (logoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = logoUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        setTimeout(reject, 5000); // 5 second timeout
      });
      doc.addImage(img, 'PNG', 14, 2, 40, 11);
    } catch (error) {
      console.warn('Failed to load logo:', error);
    }
  }

  doc.setTextColor(0, 0, 0);
  yPos = 25;

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('QUOTATION', 14, yPos);
  yPos += 10;

  // Quotation number and date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Quotation #: ${quotation.quotation_number}`, 14, yPos);
  doc.text(`Date: ${new Date(quotation.created_at).toLocaleDateString()}`, pageWidth - 14, yPos, { align: 'right' });
  yPos += 5;

  if (quotation.valid_until) {
    doc.text(`Valid Until: ${new Date(quotation.valid_until).toLocaleDateString()}`, pageWidth - 14, yPos, { align: 'right' });
  }
  yPos += 10;

  // Two column layout for customer and sales rep
  const leftCol = 14;
  const rightCol = pageWidth / 2 + 7;

  // Customer Information
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', leftCol, yPos);
  yPos += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(quotation.customer.company_name, leftCol, yPos);
  yPos += 5;
  doc.text(quotation.customer.contact_person, leftCol, yPos);
  yPos += 5;

  if (quotation.customer.email) {
    doc.text(quotation.customer.email, leftCol, yPos);
    yPos += 5;
  }

  if (quotation.customer.phone) {
    doc.text(quotation.customer.phone, leftCol, yPos);
    yPos += 5;
  }

  if (quotation.customer.address) {
    doc.text(quotation.customer.address, leftCol, yPos);
    yPos += 5;
  }

  if (quotation.customer.city && quotation.customer.country) {
    doc.text(`${quotation.customer.city}, ${quotation.customer.country}`, leftCol, yPos);
    yPos += 5;
  }

  // Sales Representative (right column)
  let rightYPos = yPos - (5 * 6);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SALES REPRESENTATIVE:', rightCol, rightYPos);
  rightYPos += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(quotation.sales_rep.full_name, rightCol, rightYPos);
  rightYPos += 5;

  if (quotation.sales_rep.email) {
    doc.text(quotation.sales_rep.email, rightCol, rightYPos);
  }

  yPos += 10;

  // Project Title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PROJECT:', 14, yPos);
  yPos += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(quotation.title, 14, yPos);
  yPos += 10;

  // Line Items Table
  const tableData = quotation.items.map(item => [
    item.is_custom
      ? item.custom_description || 'Custom Item'
      : `${item.product?.name}\n(${item.product?.sku})`,
    item.quantity.toString(),
    formatCurrency(item.unit_price),
    `${item.discount_percentage.toFixed(1)}%`,
    formatCurrency(item.line_total),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Qty', 'Unit Price', 'Discount', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [249, 115, 22],
      textColor: 255,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 30 },
      3: { halign: 'center', cellWidth: 25 },
      4: { halign: 'right', cellWidth: 30 },
    },
  });

  // Get the final Y position after the table
  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Totals Section
  const totalsX = pageWidth - 70;
  const totalsLabelX = pageWidth - 100;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Subtotal
  doc.text('Subtotal:', totalsLabelX, yPos, { align: 'right' });
  doc.text(formatCurrency(quotation.subtotal), totalsX, yPos, { align: 'right' });
  yPos += 6;

  // Discount
  if (quotation.discount_percentage > 0) {
    doc.text(`Discount (${quotation.discount_percentage.toFixed(1)}%):`, totalsLabelX, yPos, { align: 'right' });
    doc.text(`-${formatCurrency(quotation.discount_amount)}`, totalsX, yPos, { align: 'right' });
    yPos += 6;
  }

  // Tax
  doc.text(`Tax (${quotation.tax_percentage.toFixed(1)}%):`, totalsLabelX, yPos, { align: 'right' });
  doc.text(formatCurrency(quotation.tax_amount), totalsX, yPos, { align: 'right' });
  yPos += 8;

  // Total
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(249, 115, 22);
  doc.rect(totalsLabelX - 45, yPos - 5, 100, 10, 'F');

  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL:', totalsLabelX, yPos, { align: 'right' });
  doc.text(formatCurrency(quotation.total), totalsX, yPos, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  yPos += 15;

  // Notes
  if (quotation.notes) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTES:', 14, yPos);
    yPos += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const notesLines = doc.splitTextToSize(quotation.notes, pageWidth - 28);
    doc.text(notesLines, 14, yPos);
    yPos += notesLines.length * 5 + 5;
  }

  // Terms and Conditions
  if (quotation.terms_and_conditions) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('TERMS & CONDITIONS:', 14, yPos);
    yPos += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const termsLines = doc.splitTextToSize(quotation.terms_and_conditions, pageWidth - 28);
    doc.text(termsLines, 14, yPos);
    yPos += termsLines.length * 5 + 5;
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      'Thank you for your business!',
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 5,
      { align: 'center' }
    );
  }

  // Save the PDF
  doc.save(`Quotation_${quotation.quotation_number}.pdf`);
}

export async function generateQuotationsReport(
  quotations: Array<{
    quotation_number: string;
    title: string;
    created_at: string;
    status: string;
    customer: { company_name: string };
    total: number;
  }>,
  startDate?: Date,
  endDate?: Date
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Header
  doc.setFillColor(249, 115, 22);
  doc.rect(0, 0, pageWidth, 15, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('QUOTATIONS REPORT', pageWidth / 2, 10, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  yPos = 30;

  // Date range
  if (startDate && endDate) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Report Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      pageWidth / 2,
      yPos,
      { align: 'center' }
    );
    yPos += 10;
  }

  // Summary Statistics
  const totalValue = quotations.reduce((sum, q) => sum + q.total, 0);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('SUMMARY', 14, yPos);
  yPos += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Quotations: ${quotations.length}`, 14, yPos);
  yPos += 5;
  doc.text(`Total Value: ${formatCurrency(totalValue)}`, 14, yPos);
  yPos += 10;

  // Table
  const tableData = quotations.map(q => [
    q.quotation_number,
    new Date(q.created_at).toLocaleDateString(),
    q.customer.company_name,
    q.title.substring(0, 40) + (q.title.length > 40 ? '...' : ''),
    q.status,
    formatCurrency(q.total),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Quote #', 'Date', 'Customer', 'Title', 'Status', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [249, 115, 22],
      textColor: 255,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 25 },
      2: { cellWidth: 40 },
      3: { cellWidth: 50 },
      4: { cellWidth: 25 },
      5: { halign: 'right', cellWidth: 25 },
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 5,
      { align: 'center' }
    );
  }

  doc.save(`Quotations_Report_${new Date().toISOString().split('T')[0]}.pdf`);
}
