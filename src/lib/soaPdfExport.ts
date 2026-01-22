import { supabase } from './supabase';
import { formatCurrency } from './currencyUtils';
import { format } from 'date-fns';

interface LedgerItem {
  date: string;
  type: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  status: string;
}

interface SOAData {
  customer: {
    company_name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  ledger: LedgerItem[];
  generationDate: string;
  statementPeriod: {
    start: string;
    end: string;
  };
}

export const exportSOAPDF = async (data: SOAData) => {
  const settings = await getSystemSettings();
  const htmlContent = generateSOAHTML(data, settings);

  const printWindow = window.open('', '_blank', 'width=1200,height=800');

  if (!printWindow) {
    alert('Popup Blocked! Please allow popups to export the Statement of Account.');
    return false;
  }

  try {
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 1000);

    return true;
  } catch (error) {
    console.error('Error generating SOA PDF:', error);
    alert('Failed to generate PDF.');
    printWindow.close();
    return false;
  }
};

const getSystemSettings = async () => {
  try {
    const { data: settingsData } = await (supabase
      .from('system_settings') as any)
      .select('*')
      .eq('key', 'company_profile')
      .maybeSingle();

    const companyInfo = (settingsData?.value as any) || {};

    const { data: collectionSettings } = await (supabase
      .from('system_settings') as any)
      .select('*')
      .eq('key', 'collection_configuration')
      .maybeSingle();

    return {
      companyName: companyInfo.name || 'Special Offices',
      companyAddress: companyInfo.address || 'Riyadh, Saudi Arabia',
      companyPhone: companyInfo.phone || '+966 11 000 0000',
      companyEmail: companyInfo.email || 'finance@specialoffices.com',
      companyLogo: companyInfo.logo_url || 'https://raw.githubusercontent.com/shadcn.png', // Placeholder
      soaNotes: collectionSettings?.value?.soa_notes || "Please ensure all payments are made in favor of Special Offices."
    };
  } catch (error) {
    return {
      companyName: 'Special Offices',
      companyAddress: 'Riyadh, Saudi Arabia',
      companyPhone: '+966 11 000 0000',
      companyEmail: 'finance@specialoffices.com',
      companyLogo: 'https://raw.githubusercontent.com/shadcn.png',
    };
  }
};

const generateSOAHTML = (data: SOAData, settings: any) => {
  let runningBalance = 0;
  const rows = data.ledger.map(item => {
    runningBalance += (item.debit - item.credit);
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${format(new Date(item.date), 'dd/MM/yyyy')}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <div style="font-weight: 600; color: #1e293b;">${item.type}</div>
          <div style="color: #64748b; font-size: 10px;">${item.reference}</div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #475569;">${item.description}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; color: ${item.debit > 0 ? '#1e293b' : '#94a3b8'};">${item.debit > 0 ? formatCurrency(item.debit) : '-'}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; color: ${item.credit > 0 ? '#059669' : '#94a3b8'}; font-weight: ${item.credit > 0 ? '600' : 'normal'};">${item.credit > 0 ? formatCurrency(item.credit) : '-'}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-weight: 700; color: ${runningBalance > 0 ? '#b91c1c' : '#059669'};">${formatCurrency(runningBalance)}</td>
      </tr>
    `;
  }).join('');

  const totalDebits = data.ledger.reduce((sum, item) => sum + item.debit, 0);
  const totalCredits = data.ledger.reduce((sum, item) => sum + item.credit, 0);
  const finalBalance = totalDebits - totalCredits;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Statement of Account - ${data.customer.company_name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
        body { font-family: 'Inter', sans-serif; margin: 0; padding: 40px; color: #1e293b; background: white; }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .company-info h1 { margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: -0.025em; }
        .company-info p { margin: 4px 0; font-size: 12px; color: #64748b; }
        .statement-title { text-align: right; }
        .statement-title h2 { margin: 0; font-size: 20px; font-weight: 700; color: #ea580c; }
        .statement-title p { margin: 4px 0; font-size: 12px; color: #64748b; }
        
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
        .customer-card { background: #f8fafc; padding: 20px; rounded: 12px; border: 1px solid #f1f5f9; }
        .customer-card h3 { margin: 0 0 10px 0; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
        .customer-card p { margin: 2px 0; font-size: 13px; color: #1e293b; font-weight: 500; }
        
        .summary-card { display: flex; flex-direction: column; justify-content: center; align-items: flex-end; }
        .balance-box { background: #0f172a; color: white; padding: 24px; border-radius: 12px; text-align: right; width: 100%; max-width: 300px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
        .balance-box label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.7; font-weight: 700; }
        .balance-box .amount { font-size: 28px; font-weight: 800; margin-top: 4px; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        th { background: #f1f5f9; padding: 12px; text-align: left; font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0; }
        
        .footer { border-top: 2px solid #f1f5f9; padding-top: 20px; margin-top: 40px; }
        .footer-content { display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }
        
        @media print {
          body { padding: 20px; }
          .balance-box { box-shadow: none; border: 1px solid #000; }
          @page { margin: 1cm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <h1>${settings.companyName}</h1>
          <p>${settings.companyAddress}</p>
          <p>T: ${settings.companyPhone} | E: ${settings.companyEmail}</p>
        </div>
        <div class="statement-title">
          <h2>STATEMENT OF ACCOUNT</h2>
          <p>Date Generated: ${format(new Date(), 'dd MMMM yyyy')}</p>
          <p>Status: Confidential</p>
        </div>
      </div>

      <div class="details-grid">
        <div class="customer-card">
          <h3>Bill To</h3>
          <p style="font-size: 16px; font-weight: 800; margin-bottom: 8px;">${data.customer.company_name}</p>
          <p>${data.customer.address || ''}</p>
          <p>${data.customer.city || ''} ${data.customer.country || ''}</p>
          <p>Attn: ${data.customer.contact_person || 'Accounts Payable'}</p>
        </div>
        <div class="summary-card">
          <div class="balance-box">
            <label>Current Outstanding Balance</label>
            <div class="amount">${formatCurrency(finalBalance)}</div>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th width="12%">Date</th>
            <th width="18%">Ref / Type</th>
            <th width="34%">Description</th>
            <th width="12%" style="text-align: right;">Debit (+)</th>
            <th width="12%" style="text-align: right;">Credit (-)</th>
            <th width="12%" style="text-align: right;">Balance</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div style="margin-left: auto; width: 300px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px;">
          <span style="color: #64748b;">Total Debits:</span>
          <span style="font-weight: 600;">${formatCurrency(totalDebits)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 12px;">
          <span style="color: #64748b;">Total Credits:</span>
          <span style="font-weight: 600; color: #059669;">${formatCurrency(totalCredits)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 2px solid #e2e8f0; font-size: 14px;">
          <span style="font-weight: 700;">Closing Balance:</span>
          <span style="font-weight: 800; color: #b91c1c;">${formatCurrency(finalBalance)}</span>
        </div>
      </div>

      <div class="footer">
        <div style="margin-bottom: 16px;">
          <p style="font-size: 10px; font-weight: 700; color: #475569; margin-bottom: 4px; text-transform: uppercase;">Payment Terms & Notes:</p>
          <p style="font-size: 10px; color: #64748b; line-height: 1.5;">${settings.soaNotes}</p>
        </div>
        <div class="footer-content">
          <span>Generated by SalesCalc Enterprise Financial Engine</span>
          <span>Page 1 of 1</span>
        </div>
      </div>
    </body>
    </html>
  `;
};
