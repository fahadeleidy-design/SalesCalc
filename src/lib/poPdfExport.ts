import { supabase } from './supabase';

interface POData {
    po_number: string;
    po_date: string;
    required_delivery_date?: string | null;
    supplier_name: string;
    supplier_contact_person?: string | null;
    supplier_email?: string | null;
    supplier_phone?: string | null;
    supplier_address?: string | null;
    payment_terms?: string | null;
    notes?: string | null;
    total: number;
    quotation_number: string;
    customer_name: string;
    items: any[];
}

export const exportProfessionalPOPDF = async (poId: string) => {
    try {
        // Fetch full PO data including items
        const { data, error: poError } = await supabase
            .from('purchase_orders')
            .select(`
        *,
        quotation:quotations (
          quotation_number,
          customer:customers (company_name)
        ),
        items:purchase_order_items (*)
      `)
            .eq('id', poId)
            .single();

        if (poError || !data) throw poError || new Error('PO not found');

        const po = data as any;

        const formattedData: POData = {
            po_number: po.po_number,
            po_date: po.po_date,
            required_delivery_date: po.required_delivery_date,
            supplier_name: po.supplier_name,
            supplier_contact_person: po.supplier_contact_person,
            supplier_email: po.supplier_email,
            supplier_phone: po.supplier_phone,
            supplier_address: po.supplier_address,
            payment_terms: po.payment_terms,
            notes: po.notes,
            total: po.total,
            quotation_number: po.quotation?.quotation_number,
            customer_name: po.quotation?.customer?.company_name,
            items: po.items || [],
        };

        const settings = await getSystemSettings();
        const htmlContent = generateProfessionalPOHTML(formattedData, settings);

        const printWindow = window.open('', '_blank', 'width=1200,height=800');

        if (!printWindow) {
            alert('Popup blocked! Please allow popups to export PDF.');
            return false;
        }

        printWindow.document.write(htmlContent);
        printWindow.document.close();

        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 800);

        return true;
    } catch (error) {
        console.error('Error fetching/generating PO PDF:', error);
        alert('Failed to generate PO PDF.');
        return false;
    }
};

const getSystemSettings = async () => {
    try {
        const { data: settingsData, error } = await supabase
            .from('system_settings')
            .select('*')
            .limit(1)
            .single();

        if (error || !settingsData) throw error || new Error('Settings not found');

        const data = settingsData as any;

        return {
            company_name: data.company_name || 'Special Offices',
            company_logo_url: data.company_logo_url || '/logo.svg',
            company_email: 'info@specialoffices.com',
            company_phone: '+966 11 123 4567',
            company_address: 'Riyadh, Saudi Arabia',
        };
    } catch (error) {
        return {
            company_name: 'Special Offices',
            company_logo_url: '/logo.svg',
            company_email: 'info@specialoffices.com',
            company_phone: '+966 11 123 4567',
            company_address: 'Riyadh, Saudi Arabia',
        };
    }
};

const generateProfessionalPOHTML = (po: POData, settings: any): string => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Purchase Order ${po.po_number}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; font-size: 13px; line-height: 1.5; }
        .header { display: flex; justify-content: space-between; border-bottom: 3px solid #0284c7; padding-bottom: 20px; margin-bottom: 30px; }
        .company-logo { max-width: 150px; margin-bottom: 10px; }
        .header-left h1 { color: #0284c7; font-size: 28px; margin-bottom: 5px; }
        .po-info { text-align: right; }
        .po-info h2 { font-size: 32px; color: #0f172a; margin-bottom: 10px; }
        .meta-table { margin-left: auto; border-collapse: collapse; }
        .meta-table td { padding: 4px 8px; border: 1px solid #e2e8f0; }
        .label { color: #64748b; font-weight: 500; }
        .value { font-weight: 600; }
        
        .address-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
        .address-box { background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .address-box h3 { font-size: 14px; text-transform: uppercase; color: #0284c7; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
        .address-content p { margin-bottom: 3px; }
        
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .items-table th { background: #0284c7; color: white; padding: 12px; text-align: left; text-transform: uppercase; font-size: 11px; }
        .items-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        .items-table tr:nth-child(even) { background: #fcfcfc; }
        
        .summary-wrapper { display: flex; justify-content: flex-end; }
        .summary-table { width: 300px; border-collapse: collapse; }
        .summary-table td { padding: 8px; border: 1px solid #e2e8f0; }
        .total-row { background: #f8fafc; font-size: 16px; font-weight: 700; color: #0284c7; }
        
        .notes-section { margin-top: 40px; }
        .notes-section h3 { font-size: 14px; margin-bottom: 10px; color: #0f172a; }
        .notes-box { padding: 15px; border: 1px dashed #cbd5e1; border-radius: 8px; color: #475569; }
        
        .footer { margin-top: 60px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; color: #94a3b8; font-size: 11px; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          <img src="${settings.company_logo_url}" class="company-logo" />
          <h1>${settings.company_name}</h1>
          <p>${settings.company_address}</p>
          <p>Email: ${settings.company_email} | Phone: ${settings.company_phone}</p>
        </div>
        <div class="po-info">
          <h2>PURCHASE ORDER</h2>
          <table class="meta-table">
            <tr><td class="label">PO Number</td><td class="value">${po.po_number}</td></tr>
            <tr><td class="label">Date</td><td class="value">${new Date(po.po_date).toLocaleDateString()}</td></tr>
            <tr><td class="label">Ref. Quotation</td><td class="value">${po.quotation_number}</td></tr>
            <tr><td class="label">Delivery Due</td><td class="value">${po.required_delivery_date ? new Date(po.required_delivery_date).toLocaleDateString() : 'N/A'}</td></tr>
          </table>
        </div>
      </div>

      <div class="address-grid">
        <div class="address-box">
          <h3>Supplier</h3>
          <div class="address-content">
            <p><strong>${po.supplier_name}</strong></p>
            ${po.supplier_contact_person ? `<p>${po.supplier_contact_person}</p>` : ''}
            ${po.supplier_address ? `<p>${po.supplier_address}</p>` : ''}
            ${po.supplier_email ? `<p>${po.supplier_email}</p>` : ''}
            ${po.supplier_phone ? `<p>${po.supplier_phone}</p>` : ''}
          </div>
        </div>
        <div class="address-box">
          <h3>Ship To / Billing</h3>
          <div class="address-content">
            <p><strong>${settings.company_name}</strong></p>
            <p>${settings.company_address}</p>
            <p>Ref: Project ${po.quotation_number}</p>
            <p>Customer: ${po.customer_name}</p>
          </div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 50%;">Item Description</th>
            <th style="width: 10%; text-align: center;">Qty</th>
            <th style="width: 20%; text-align: right;">Unit Price</th>
            <th style="width: 20%; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${po.items.map(item => `
            <tr>
              <td>
                <div style="font-weight: 600;">${item.item_description}</div>
                ${item.product_sku ? `<div style="font-size: 10px; color: #64748b;">SKU: ${item.product_sku}</div>` : ''}
              </td>
              <td style="text-align: center;">${item.quantity}</td>
              <td style="text-align: right;">SAR ${item.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right;">SAR ${item.line_total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="summary-wrapper">
        <table class="summary-table">
          <tr><td class="label">Subtotal</td><td style="text-align: right;">SAR ${po.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>
          <tr class="total-row"><td class="label">Total Amount</td><td style="text-align: right;">SAR ${po.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>
        </table>
      </div>

      <div class="notes-section">
        <h3>Payment Terms & Notes</h3>
        <div class="notes-box">
          <p><strong>Terms:</strong> ${po.payment_terms || 'Standard'}</p>
          ${po.notes ? `<p style="margin-top: 10px;">${po.notes}</p>` : ''}
        </div>
      </div>

      <div class="footer">
        <p>This is a computer generated document. No signature required.</p>
        <p>© ${new Date().getFullYear()} ${settings.company_name}. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
};
