import * as XLSX from 'xlsx';
import { supabase } from './supabase';

// Lead data structure
export interface LeadImportData {
  company_name: string;
  contact_name: string;
  contact_email?: string;
  contact_phone?: string;
  position?: string;
  industry?: string;
  country?: string;
  city?: string;
  address?: string;
  website?: string;
  lead_source?: string;
  lead_status?: string;
  lead_score?: number;
  estimated_value?: number;
  expected_close_date?: string;
  notes?: string;
}

// Opportunity data structure
export interface OpportunityImportData {
  name: string;
  customer_id?: string;
  lead_id?: string;
  stage?: string;
  amount: number;
  probability?: number;
  expected_close_date?: string;
  description?: string;
  next_step?: string;
  notes?: string;
}

// Export Leads to Excel
export async function exportLeadsToExcel(leads: any[], filename: string = 'crm_leads_export') {
  const exportData = leads.map(lead => ({
    'Company Name': lead.company_name,
    'Contact Name': lead.contact_name,
    'Email': lead.contact_email || '',
    'Phone': lead.contact_phone || '',
    'Position': lead.position || '',
    'Industry': lead.industry || '',
    'Country': lead.country || '',
    'City': lead.city || '',
    'Address': lead.address || '',
    'Website': lead.website || '',
    'Lead Source': lead.lead_source || '',
    'Status': lead.lead_status || '',
    'Score': lead.lead_score || 0,
    'Estimated Value': lead.estimated_value || 0,
    'Expected Close Date': lead.expected_close_date || '',
    'Assigned To': lead.assigned_user?.full_name || '',
    'Notes': lead.notes || '',
    'Created At': new Date(lead.created_at).toLocaleDateString(),
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');

  // Set column widths
  const colWidths = [
    { wch: 25 }, // Company Name
    { wch: 20 }, // Contact Name
    { wch: 25 }, // Email
    { wch: 15 }, // Phone
    { wch: 15 }, // Position
    { wch: 15 }, // Industry
    { wch: 15 }, // Country
    { wch: 15 }, // City
    { wch: 30 }, // Address
    { wch: 20 }, // Website
    { wch: 12 }, // Source
    { wch: 12 }, // Status
    { wch: 8 },  // Score
    { wch: 15 }, // Value
    { wch: 15 }, // Close Date
    { wch: 20 }, // Assigned To
    { wch: 30 }, // Notes
    { wch: 12 }, // Created At
  ];
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// Export Opportunities to Excel
export async function exportOpportunitiesToExcel(opportunities: any[], filename: string = 'crm_opportunities_export') {
  const exportData = opportunities.map(opp => ({
    'Opportunity Name': opp.name,
    'Customer': opp.customer?.company_name || '',
    'Lead': opp.lead?.company_name || '',
    'Stage': opp.stage || '',
    'Amount': opp.amount || 0,
    'Probability (%)': opp.probability || 0,
    'Expected Close Date': opp.expected_close_date || '',
    'Actual Close Date': opp.actual_close_date || '',
    'Assigned To': opp.assigned_user?.full_name || '',
    'Description': opp.description || '',
    'Next Step': opp.next_step || '',
    'Notes': opp.notes || '',
    'Closed Won': opp.closed_won ? 'Yes' : 'No',
    'Won Reason': opp.won_reason || '',
    'Lost Reason': opp.lost_reason || '',
    'Created At': new Date(opp.created_at).toLocaleDateString(),
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Opportunities');

  // Set column widths
  const colWidths = [
    { wch: 30 }, // Name
    { wch: 25 }, // Customer
    { wch: 25 }, // Lead
    { wch: 15 }, // Stage
    { wch: 15 }, // Amount
    { wch: 12 }, // Probability
    { wch: 15 }, // Expected Date
    { wch: 15 }, // Actual Date
    { wch: 20 }, // Assigned To
    { wch: 40 }, // Description
    { wch: 30 }, // Next Step
    { wch: 30 }, // Notes
    { wch: 10 }, // Closed Won
    { wch: 20 }, // Won Reason
    { wch: 20 }, // Lost Reason
    { wch: 12 }, // Created At
  ];
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// Import Leads from Excel/CSV
export async function importLeadsFromFile(file: File, userId: string): Promise<{ success: number; errors: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        let successCount = 0;
        const errors: string[] = [];

        for (let i = 0; i < jsonData.length; i++) {
          const row: any = jsonData[i];
          try {
            // Map Excel columns to database fields
            const leadData: any = {
              company_name: row['Company Name'] || row['company_name'],
              contact_name: row['Contact Name'] || row['contact_name'],
              contact_email: row['Email'] || row['contact_email'] || null,
              contact_phone: row['Phone'] || row['contact_phone'] || null,
              position: row['Position'] || row['position'] || null,
              industry: row['Industry'] || row['industry'] || null,
              country: row['Country'] || row['country'] || 'Saudi Arabia',
              city: row['City'] || row['city'] || null,
              address: row['Address'] || row['address'] || null,
              website: row['Website'] || row['website'] || null,
              lead_source: (row['Lead Source'] || row['lead_source'] || 'other').toLowerCase().replace(/\s+/g, '_'),
              lead_status: (row['Status'] || row['lead_status'] || 'new').toLowerCase().replace(/\s+/g, '_'),
              lead_score: parseInt(row['Score'] || row['lead_score']) || 0,
              estimated_value: parseFloat(row['Estimated Value'] || row['estimated_value']) || null,
              expected_close_date: row['Expected Close Date'] || row['expected_close_date'] || null,
              notes: row['Notes'] || row['notes'] || null,
              assigned_to: userId,
              created_by: userId,
            };

            // Validate required fields
            if (!leadData.company_name || !leadData.contact_name) {
              errors.push(`Row ${i + 2}: Missing required fields (Company Name or Contact Name)`);
              continue;
            }

            // Validate enum values
            const validLeadSources = ['website', 'referral', 'cold_call', 'email_campaign', 'social_media', 'event', 'partner', 'direct', 'other'];
            if (leadData.lead_source && !validLeadSources.includes(leadData.lead_source)) {
              leadData.lead_source = 'other';
            }

            // Insert into database
            const { error } = await supabase
              .from('crm_leads')
              .insert(leadData);

            if (error) {
              errors.push(`Row ${i + 2}: ${error.message}`);
            } else {
              successCount++;
            }
          } catch (error: any) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          }
        }

        resolve({ success: successCount, errors });
      } catch (error: any) {
        reject(new Error(`Failed to parse file: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsBinaryString(file);
  });
}

// Import Opportunities from Excel/CSV
export async function importOpportunitiesFromFile(file: File, userId: string): Promise<{ success: number; errors: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        let successCount = 0;
        const errors: string[] = [];

        for (let i = 0; i < jsonData.length; i++) {
          const row: any = jsonData[i];
          try {
            // Map Excel columns to database fields
            const oppData: any = {
              name: row['Opportunity Name'] || row['name'],
              stage: (row['Stage'] || row['stage'] || 'prospecting').toLowerCase().replace(/\s+/g, '_'),
              amount: parseFloat(row['Amount'] || row['amount']) || 0,
              probability: parseInt(row['Probability (%)'] || row['Probability'] || row['probability']) || 50,
              expected_close_date: row['Expected Close Date'] || row['expected_close_date'] || null,
              description: row['Description'] || row['description'] || null,
              next_step: row['Next Step'] || row['next_step'] || null,
              notes: row['Notes'] || row['notes'] || null,
              assigned_to: userId,
              created_by: userId,
            };

            // Validate required fields
            if (!oppData.name) {
              errors.push(`Row ${i + 2}: Missing required field (Opportunity Name)`);
              continue;
            }

            // Insert into database
            const { error } = await supabase
              .from('crm_opportunities')
              .insert(oppData);

            if (error) {
              errors.push(`Row ${i + 2}: ${error.message}`);
            } else {
              successCount++;
            }
          } catch (error: any) {
            errors.push(`Row ${i + 2}: ${error.message}`);
          }
        }

        resolve({ success: successCount, errors });
      } catch (error: any) {
        reject(new Error(`Failed to parse file: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsBinaryString(file);
  });
}

// Generate template for Leads import
export function downloadLeadsTemplate() {
  const templateData = [
    {
      'Company Name': 'Example Corp',
      'Contact Name': 'John Doe',
      'Email': 'john@example.com',
      'Phone': '+966501234567',
      'Position': 'CEO',
      'Industry': 'Technology',
      'Country': 'Saudi Arabia',
      'City': 'Riyadh',
      'Address': '123 King Fahd Road',
      'Website': 'https://example.com',
      'Lead Source': 'referral',
      'Status': 'new',
      'Score': '75',
      'Estimated Value': '50000',
      'Expected Close Date': '2024-12-31',
      'Notes': 'Interested in our products',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads Template');

  // Set column widths
  const colWidths = [
    { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 20 },
    { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 30 },
  ];
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, 'crm_leads_template.xlsx');
}

// Generate template for Opportunities import
export function downloadOpportunitiesTemplate() {
  const templateData = [
    {
      'Opportunity Name': 'Example Deal',
      'Stage': 'prospecting',
      'Amount': '100000',
      'Probability (%)': '50',
      'Expected Close Date': '2024-12-31',
      'Description': 'Large enterprise deal',
      'Next Step': 'Schedule demo',
      'Notes': 'Follow up next week',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Opportunities Template');

  // Set column widths
  const colWidths = [
    { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
    { wch: 15 }, { wch: 40 }, { wch: 30 }, { wch: 30 },
  ];
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, 'crm_opportunities_template.xlsx');
}
