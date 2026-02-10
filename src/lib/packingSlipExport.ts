import { supabase } from './supabase';

interface ShipmentData {
  shipment_number: string;
  job_order_number: string;
  customer_name: string;
  customer_contact: string;
  shipping_address: string;
  delivery_city: string;
  delivery_country: string;
  delivery_contact_name: string;
  delivery_contact_phone: string;
  carrier_name: string;
  tracking_number: string;
  vehicle_number: string;
  driver_name: string;
  driver_phone: string;
  scheduled_ship_date: string | null;
  total_packages: number;
  total_weight_kg: number | null;
  notes: string;
  items: { description: string; quantity: number; package_number: string; notes: string }[];
}

export const generatePackingSlip = async (shipmentId: string) => {
  try {
    const { data, error } = await supabase
      .from('shipments')
      .select(`
        *,
        job_order:job_orders(job_order_number),
        customer:customers(company_name, contact_person, address, city, country, phone),
        items:shipment_items(*)
      `)
      .eq('id', shipmentId)
      .single();

    if (error || !data) throw error || new Error('Shipment not found');

    const s = data as any;
    const shipmentData: ShipmentData = {
      shipment_number: s.shipment_number,
      job_order_number: s.job_order?.job_order_number || '',
      customer_name: s.customer?.company_name || '',
      customer_contact: s.delivery_contact_name || s.customer?.contact_person || '',
      shipping_address: s.shipping_address || s.customer?.address || '',
      delivery_city: s.delivery_city || s.customer?.city || '',
      delivery_country: s.delivery_country || s.customer?.country || '',
      delivery_contact_name: s.delivery_contact_name || s.customer?.contact_person || '',
      delivery_contact_phone: s.delivery_contact_phone || s.customer?.phone || '',
      carrier_name: s.carrier_name || '',
      tracking_number: s.tracking_number || '',
      vehicle_number: s.vehicle_number || '',
      driver_name: s.driver_name || '',
      driver_phone: s.driver_phone || '',
      scheduled_ship_date: s.scheduled_ship_date || s.actual_ship_date,
      total_packages: s.total_packages || 0,
      total_weight_kg: s.total_weight_kg,
      notes: s.notes || '',
      items: (s.items || []).map((item: any) => ({
        description: item.item_description,
        quantity: Number(item.quantity_shipped),
        package_number: item.package_number || '-',
        notes: item.notes || '',
      })),
    };

    const settings = await getSystemSettings();
    const html = generatePackingSlipHTML(shipmentData, settings);

    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
      alert('Popup blocked! Please allow popups to print the packing slip.');
      return false;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 800);

    return true;
  } catch (err) {
    console.error('Error generating packing slip:', err);
    alert('Failed to generate packing slip.');
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

    if (error || !data) throw error;
    const d = data as any;
    return {
      company_name: d.company_name || 'Special Offices',
      company_logo_url: d.company_logo_url || '/logo.svg',
      company_email: 'info@specialoffices.com',
      company_phone: '+966 11 123 4567',
      company_address: 'Riyadh, Saudi Arabia',
    };
  } catch {
    return {
      company_name: 'Special Offices',
      company_logo_url: '/logo.svg',
      company_email: 'info@specialoffices.com',
      company_phone: '+966 11 123 4567',
      company_address: 'Riyadh, Saudi Arabia',
    };
  }
};

const generatePackingSlipHTML = (data: ShipmentData, settings: any): string => {
  const itemRows = data.items.map((item, idx) => `
    <tr>
      <td style="text-align:center;">${idx + 1}</td>
      <td>${item.description}</td>
      <td style="text-align:center;">${item.quantity}</td>
      <td style="text-align:center;">${item.package_number}</td>
      <td>${item.notes}</td>
    </tr>
  `).join('');

  const shipDate = data.scheduled_ship_date
    ? new Date(data.scheduled_ship_date).toLocaleDateString()
    : new Date().toLocaleDateString();

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Packing Slip - ${data.shipment_number}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; font-size: 12px; line-height: 1.5; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0284c7; padding-bottom: 20px; margin-bottom: 24px; }
      .company-logo { max-width: 120px; margin-bottom: 8px; }
      .header-left h1 { color: #0284c7; font-size: 20px; margin-bottom: 4px; }
      .header-left p { color: #64748b; font-size: 11px; }
      .doc-title { text-align: right; }
      .doc-title h2 { font-size: 24px; color: #0f172a; letter-spacing: 1px; margin-bottom: 8px; }
      .meta-grid { display: grid; grid-template-columns: auto auto; gap: 4px 12px; text-align: right; }
      .meta-label { color: #64748b; font-size: 11px; }
      .meta-value { font-weight: 600; font-size: 12px; }

      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
      .info-box { background: #f8fafc; padding: 16px; border-radius: 6px; border: 1px solid #e2e8f0; }
      .info-box h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #0284c7; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; font-weight: 600; }
      .info-box p { margin-bottom: 2px; font-size: 12px; }
      .info-box .name { font-weight: 600; font-size: 13px; margin-bottom: 4px; }

      .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
      .items-table th { background: #0284c7; color: white; padding: 10px 12px; text-align: left; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
      .items-table td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; font-size: 12px; }
      .items-table tr:nth-child(even) { background: #fafbfc; }

      .summary-row { display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px; font-size: 12px; }
      .summary-item { display: flex; align-items: center; gap: 6px; }
      .summary-item .lbl { color: #64748b; }
      .summary-item .val { font-weight: 700; color: #0f172a; }

      .notes-section { margin-bottom: 40px; }
      .notes-section h3 { font-size: 12px; margin-bottom: 8px; color: #0f172a; font-weight: 600; }
      .notes-box { padding: 12px; border: 1px dashed #cbd5e1; border-radius: 6px; color: #475569; min-height: 40px; font-size: 12px; }

      .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 40px; margin-top: 60px; }
      .sig-block { text-align: center; }
      .sig-line { border-top: 1px solid #94a3b8; margin-top: 50px; padding-top: 8px; }
      .sig-label { font-size: 11px; font-weight: 600; color: #475569; }
      .sig-date { font-size: 10px; color: #94a3b8; margin-top: 4px; }

      .footer { margin-top: 40px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; color: #94a3b8; font-size: 10px; }
      @media print {
        body { padding: 20px; }
        .no-print { display: none; }
      }
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
      <div class="doc-title">
        <h2>PACKING SLIP</h2>
        <div class="meta-grid">
          <span class="meta-label">Shipment #</span><span class="meta-value">${data.shipment_number}</span>
          <span class="meta-label">Date</span><span class="meta-value">${shipDate}</span>
          <span class="meta-label">Job Order</span><span class="meta-value">${data.job_order_number}</span>
          ${data.tracking_number ? `<span class="meta-label">Tracking</span><span class="meta-value">${data.tracking_number}</span>` : ''}
        </div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-box">
        <h3>Ship To</h3>
        <p class="name">${data.customer_name}</p>
        <p>${data.delivery_contact_name}</p>
        ${data.shipping_address ? `<p>${data.shipping_address}</p>` : ''}
        <p>${[data.delivery_city, data.delivery_country].filter(Boolean).join(', ')}</p>
        ${data.delivery_contact_phone ? `<p>Phone: ${data.delivery_contact_phone}</p>` : ''}
      </div>
      <div class="info-box">
        <h3>Carrier Information</h3>
        <p><strong>Carrier:</strong> ${data.carrier_name || 'N/A'}</p>
        <p><strong>Vehicle:</strong> ${data.vehicle_number || 'N/A'}</p>
        <p><strong>Driver:</strong> ${data.driver_name || 'N/A'}</p>
        ${data.driver_phone ? `<p><strong>Driver Phone:</strong> ${data.driver_phone}</p>` : ''}
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width:50px;text-align:center;">#</th>
          <th>Description</th>
          <th style="width:80px;text-align:center;">Quantity</th>
          <th style="width:80px;text-align:center;">Package</th>
          <th style="width:150px;">Notes</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <div class="summary-row">
      <div class="summary-item">
        <span class="lbl">Total Items:</span>
        <span class="val">${data.items.length}</span>
      </div>
      <div class="summary-item">
        <span class="lbl">Total Quantity:</span>
        <span class="val">${data.items.reduce((s, i) => s + i.quantity, 0)}</span>
      </div>
      <div class="summary-item">
        <span class="lbl">Total Packages:</span>
        <span class="val">${data.total_packages}</span>
      </div>
      ${data.total_weight_kg ? `
      <div class="summary-item">
        <span class="lbl">Total Weight:</span>
        <span class="val">${data.total_weight_kg} kg</span>
      </div>` : ''}
    </div>

    ${data.notes ? `
    <div class="notes-section">
      <h3>Special Instructions / Notes</h3>
      <div class="notes-box">${data.notes}</div>
    </div>` : ''}

    <div class="signatures">
      <div class="sig-block">
        <div class="sig-line">
          <div class="sig-label">Prepared By</div>
          <div class="sig-date">Date: _______________</div>
        </div>
      </div>
      <div class="sig-block">
        <div class="sig-line">
          <div class="sig-label">Checked By</div>
          <div class="sig-date">Date: _______________</div>
        </div>
      </div>
      <div class="sig-block">
        <div class="sig-line">
          <div class="sig-label">Received By</div>
          <div class="sig-date">Date: _______________</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>${settings.company_name} | ${settings.company_address} | ${settings.company_phone} | ${settings.company_email}</p>
      <p style="margin-top:4px;">This document serves as a packing slip and delivery note. Please verify all items upon receipt.</p>
    </div>
  </body>
  </html>`;
};
