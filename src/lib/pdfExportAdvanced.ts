import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Quotation } from '../hooks/useQuotations';
import { format } from 'date-fns';

/**
 * Export quotation to professional PDF using jsPDF
 */
export function exportQuotationToPDFAdvanced(quotation: Quotation, companyInfo?: CompanyInfo) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Company Info (if provided)
  const company = companyInfo || {
    name: 'Your Company Name',
    address: '123 Business Street',
    city: 'City, State 12345',
    phone: '+1 (555) 123-4567',
    email: 'info@company.com',
    website: 'www.company.com',
  };

  // Header - Company Info
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name, 20, yPosition);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(company.address, 20, yPosition + 7);
  doc.text(company.city, 20, yPosition + 12);
  doc.text(`Tel: ${company.phone}`, 20, yPosition + 17);
  doc.text(`Email: ${company.email}`, 20, yPosition + 22);

  // Title - QUOTATION
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(59, 130, 246); // Blue color
  doc.text('QUOTATION', pageWidth - 20, yPosition, { align: 'right' });

  // Quotation Number and Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`#${quotation.quotation_number}`, pageWidth - 20, yPosition + 10, { align: 'right' });
  doc.text(format(new Date(quotation.created_at), 'MMMM dd, yyyy'), pageWidth - 20, yPosition + 16, { align: 'right' });

  yPosition += 35;

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 10;

  // Customer Information
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 20, yPosition);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(quotation.customer_name, 20, yPosition + 7);
  doc.text(quotation.contact_person, 20, yPosition + 13);
  doc.text(quotation.email, 20, yPosition + 19);
  doc.text(quotation.phone, 20, yPosition + 25);

  yPosition += 40;

  // Line Items Table
  const tableData = quotation.items.map((item: any, index: number) => [
    index + 1,
    item.name || item.product_name,
    item.description || '',
    item.quantity,
    item.unit || 'pcs',
    `$${item.unit_price.toFixed(2)}`,
    item.discount_percentage ? `${item.discount_percentage}%` : '-',
    `$${item.total.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['#', 'Product/Service', 'Description', 'Qty', 'Unit', 'Unit Price', 'Disc.', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    styles: {
      fontSize: 9,
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 40 },
      2: { cellWidth: 50 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 20, halign: 'center' },
      7: { cellWidth: 25, halign: 'right' },
    },
  });

  // Get final Y position after table
  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Summary Box
  const summaryX = pageWidth - 80;
  const summaryWidth = 60;

  // Subtotal
  doc.setFontSize(10);
  doc.text('Subtotal:', summaryX, yPosition);
  doc.text(`$${quotation.subtotal.toFixed(2)}`, summaryX + summaryWidth, yPosition, { align: 'right' });

  // Tax
  yPosition += 7;
  doc.text(`Tax (${quotation.tax_rate}%):`, summaryX, yPosition);
  doc.text(`$${quotation.tax_amount.toFixed(2)}`, summaryX + summaryWidth, yPosition, { align: 'right' });

  // Discount
  if (quotation.discount_percentage > 0) {
    yPosition += 7;
    doc.text(`Discount (${quotation.discount_percentage}%):`, summaryX, yPosition);
    doc.text(`-$${quotation.discount_amount.toFixed(2)}`, summaryX + summaryWidth, yPosition, { align: 'right' });
  }

  // Total line
  yPosition += 5;
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(summaryX, yPosition, summaryX + summaryWidth, yPosition);

  // Total
  yPosition += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total:', summaryX, yPosition);
  doc.text(`$${quotation.net_total.toFixed(2)}`, summaryX + summaryWidth, yPosition, { align: 'right' });

  // Notes
  if (quotation.notes && quotation.notes.trim()) {
    yPosition += 20;

    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Notes:', 20, yPosition);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const splitNotes = doc.splitTextToSize(quotation.notes, pageWidth - 40);
    doc.text(splitNotes, 20, yPosition + 7);
  }

  // Footer
  const footerY = pageHeight - 20;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(128, 128, 128);
  doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Generated on ${format(new Date(), 'MMMM dd, yyyy')}`, pageWidth / 2, footerY + 5, { align: 'center' });

  // Save PDF
  doc.save(`quotation_${quotation.quotation_number}.pdf`);
}

/**
 * Export quotations list to PDF
 */
export function exportQuotationsListToPDF(quotations: Quotation[], title: string = 'Quotations Report') {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, 20, { align: 'center' });

  // Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on ${format(new Date(), 'MMMM dd, yyyy')}`, pageWidth / 2, 28, { align: 'center' });

  // Table
  const tableData = quotations.map((q) => [
    q.quotation_number,
    q.customer_name,
    format(new Date(q.created_at), 'yyyy-MM-dd'),
    `$${q.net_total.toFixed(2)}`,
    q.approval_status,
  ]);

  autoTable(doc, {
    startY: 35,
    head: [['Quotation #', 'Customer', 'Date', 'Total', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 60 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'center' },
    },
  });

  // Summary
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  const total = quotations.reduce((sum, q) => sum + q.net_total, 0);

  doc.setFont('helvetica', 'bold');
  doc.text(`Total Quotations: ${quotations.length}`, 20, finalY);
  doc.text(`Total Value: $${total.toFixed(2)}`, 20, finalY + 7);

  doc.save(`quotations_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

/**
 * Company information interface
 */
export interface CompanyInfo {
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
}
