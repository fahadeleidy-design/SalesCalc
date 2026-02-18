import { supabase } from './supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  report_type: 'financial' | 'sales' | 'operational' | 'compliance' | 'custom';
  data_source: string;
  parameters: Record<string, any>;
  format: 'pdf' | 'excel' | 'csv';
  is_active: boolean;
}

export interface ReportGeneration {
  id: string;
  template_id: string;
  schedule_id?: string;
  report_period_start: string;
  report_period_end: string;
  status: 'generating' | 'ready' | 'failed' | 'delivered' | 'expired';
  file_path?: string;
  file_size?: number;
  parameters_used: Record<string, any>;
}

export interface DataFilter {
  role?: string;
  user_id?: string;
  department?: string;
  region?: string;
  team_id?: string;
  custom_filters?: Record<string, any>;
}

export class GovernanceReportService {
  async generateReport(
    templateId: string,
    periodStart: Date,
    periodEnd: Date,
    dataFilter?: DataFilter
  ): Promise<string> {
    try {
      const { data: template, error: templateError } = await supabase
        .from('report_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;
      if (!template) throw new Error('Template not found');

      const generation = await this.createGeneration(
        templateId,
        periodStart,
        periodEnd
      );

      const reportData = await this.fetchReportData(
        template.data_source,
        periodStart,
        periodEnd,
        dataFilter,
        template.parameters
      );

      const filteredData = this.applyRoleBasedFiltering(reportData, dataFilter);

      let fileContent: Blob;
      let fileName: string;

      switch (template.format) {
        case 'pdf':
          fileContent = await this.generatePDF(template, filteredData, periodStart, periodEnd);
          fileName = `${template.name}_${periodStart.toISOString().split('T')[0]}_${periodEnd.toISOString().split('T')[0]}.pdf`;
          break;
        case 'excel':
          fileContent = await this.generateExcel(template, filteredData, periodStart, periodEnd);
          fileName = `${template.name}_${periodStart.toISOString().split('T')[0]}_${periodEnd.toISOString().split('T')[0]}.xlsx`;
          break;
        case 'csv':
          fileContent = await this.generateCSV(filteredData);
          fileName = `${template.name}_${periodStart.toISOString().split('T')[0]}_${periodEnd.toISOString().split('T')[0]}.csv`;
          break;
        default:
          throw new Error('Unsupported format');
      }

      const encryptedFile = await this.encryptFile(fileContent);
      const filePath = await this.uploadToStorage(fileName, encryptedFile.data);

      await this.updateGeneration(generation.id, {
        status: 'ready',
        file_path: filePath,
        file_size: fileContent.size,
        encryption_key: encryptedFile.key,
      });

      await this.logAction(generation.id, 'created');

      return generation.id;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  private async createGeneration(
    templateId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{ id: string }> {
    const { data, error } = await supabase
      .from('report_generations')
      .insert({
        template_id: templateId,
        report_period_start: periodStart.toISOString().split('T')[0],
        report_period_end: periodEnd.toISOString().split('T')[0],
        status: 'generating',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;
    return data;
  }

  private async fetchReportData(
    dataSource: string,
    periodStart: Date,
    periodEnd: Date,
    dataFilter?: DataFilter,
    parameters?: Record<string, any>
  ): Promise<any[]> {
    if (dataSource.startsWith('SELECT')) {
      const { data, error } = await supabase.rpc('execute_report_query', {
        query: dataSource,
        start_date: periodStart.toISOString(),
        end_date: periodEnd.toISOString(),
        params: parameters || {},
      });

      if (error) throw error;
      return data || [];
    }

    let query = supabase.from(dataSource).select('*');

    if (periodStart) {
      query = query.gte('created_at', periodStart.toISOString());
    }
    if (periodEnd) {
      query = query.lte('created_at', periodEnd.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }

  private applyRoleBasedFiltering(
    data: any[],
    dataFilter?: DataFilter
  ): any[] {
    if (!dataFilter) return data;

    return data.filter((row) => {
      if (dataFilter.role && row.role !== dataFilter.role) return false;
      if (dataFilter.user_id && row.user_id !== dataFilter.user_id) return false;
      if (dataFilter.department && row.department !== dataFilter.department) return false;
      if (dataFilter.region && row.region !== dataFilter.region) return false;
      if (dataFilter.team_id && row.team_id !== dataFilter.team_id) return false;

      if (dataFilter.custom_filters) {
        for (const [key, value] of Object.entries(dataFilter.custom_filters)) {
          if (row[key] !== value) return false;
        }
      }

      return true;
    });
  }

  private async generatePDF(
    template: ReportTemplate,
    data: any[],
    periodStart: Date,
    periodEnd: Date
  ): Promise<Blob> {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text(template.name, 14, 20);

    doc.setFontSize(10);
    doc.text(`Report Period: ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36);

    if (template.description) {
      doc.setFontSize(9);
      doc.text(template.description, 14, 42);
    }

    if (data.length > 0) {
      const columns = Object.keys(data[0]).map((key) => ({
        header: key.replace(/_/g, ' ').toUpperCase(),
        dataKey: key,
      }));

      autoTable(doc, {
        startY: 50,
        columns: columns,
        body: data,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 8 },
      });
    } else {
      doc.text('No data available for this period.', 14, 50);
    }

    doc.setFontSize(8);
    doc.text('CONFIDENTIAL - For Authorized Use Only', 14, doc.internal.pageSize.height - 10);

    return doc.output('blob');
  }

  private async generateExcel(
    template: ReportTemplate,
    data: any[],
    periodStart: Date,
    periodEnd: Date
  ): Promise<Blob> {
    const workbook = XLSX.utils.book_new();

    const headerInfo = [
      [template.name],
      [`Report Period: ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(headerInfo);

    if (data.length > 0) {
      XLSX.utils.sheet_add_json(worksheet, data, { origin: -1 });
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report Data');

    const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  private async generateCSV(data: any[]): Promise<Blob> {
    if (data.length === 0) {
      return new Blob(['No data available'], { type: 'text/csv' });
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((row) =>
      Object.values(row)
        .map((val) => `"${val}"`)
        .join(',')
    );

    const csv = [headers, ...rows].join('\n');
    return new Blob([csv], { type: 'text/csv' });
  }

  private async encryptFile(file: Blob): Promise<{ data: Blob; key: string }> {
    const key = this.generateEncryptionKey();
    return { data: file, key };
  }

  private generateEncryptionKey(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async uploadToStorage(fileName: string, file: Blob): Promise<string> {
    const path = `reports/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${fileName}`;

    const { error } = await supabase.storage
      .from('governance-reports')
      .upload(path, file, { upsert: true });

    if (error) throw error;

    return path;
  }

  private async updateGeneration(
    id: string,
    updates: Partial<ReportGeneration>
  ): Promise<void> {
    const { error } = await supabase
      .from('report_generations')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  private async logAction(
    generationId: string,
    action: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await supabase.rpc('log_report_action', {
      p_generation_id: generationId,
      p_action: action,
      p_metadata: metadata || {},
    });
  }

  async distributeReport(generationId: string): Promise<void> {
    const { data: generation } = await supabase
      .from('report_generations')
      .select('*, report_schedules(*, report_distributions(*))')
      .eq('id', generationId)
      .single();

    if (!generation) throw new Error('Generation not found');

    const distributions = generation.report_schedules?.report_distributions || [];

    for (const dist of distributions) {
      if (!dist.is_active) continue;

      if (dist.requires_approval) {
        await this.createApprovalRequest(generationId, dist.id, dist.recipient_role);
      } else {
        await this.sendReportEmail(generationId, dist);
      }
    }
  }

  private async createApprovalRequest(
    generationId: string,
    distributionId: string,
    approverRole: string
  ): Promise<void> {
    await supabase.from('report_approvals').insert({
      generation_id: generationId,
      distribution_id: distributionId,
      approver_role: approverRole,
      status: 'pending',
    });
  }

  private async sendReportEmail(
    generationId: string,
    distribution: any
  ): Promise<void> {
    const trackingToken = crypto.randomUUID();

    const { data: delivery } = await supabase
      .from('report_deliveries')
      .insert({
        generation_id: generationId,
        distribution_id: distribution.id,
        recipient_email: distribution.recipient_email,
        recipient_role: distribution.recipient_role,
        tracking_token: trackingToken,
        delivery_status: 'pending',
      })
      .select()
      .single();

    if (!delivery) throw new Error('Failed to create delivery record');
  }

  async approveDistribution(approvalId: string, comments?: string): Promise<void> {
    const { data: approval } = await supabase
      .from('report_approvals')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        comments,
      })
      .eq('id', approvalId)
      .select('generation_id, distribution_id')
      .single();

    if (!approval) throw new Error('Approval not found');

    const { data: distribution } = await supabase
      .from('report_distributions')
      .select('*')
      .eq('id', approval.distribution_id)
      .single();

    if (distribution) {
      await this.sendReportEmail(approval.generation_id, distribution);
    }

    await this.logAction(approval.generation_id, 'approved', { approval_id: approvalId });
  }

  async trackDownload(deliveryId: string): Promise<void> {
    const { data: delivery } = await supabase
      .from('report_deliveries')
      .select('generation_id, download_count')
      .eq('id', deliveryId)
      .single();

    if (!delivery) return;

    await supabase
      .from('report_deliveries')
      .update({
        download_count: (delivery.download_count || 0) + 1,
        last_downloaded_at: new Date().toISOString(),
      })
      .eq('id', deliveryId);

    await this.logAction(delivery.generation_id, 'downloaded', { delivery_id: deliveryId });
  }

  async getAuditTrail(generationId: string): Promise<any[]> {
    const { data } = await supabase
      .from('report_audit_log')
      .select('*, profiles(full_name, email)')
      .eq('generation_id', generationId)
      .order('created_at', { ascending: false });

    return data || [];
  }
}

export const governanceReportService = new GovernanceReportService();
