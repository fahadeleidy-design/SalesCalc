import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import toast from 'react-hot-toast';

export interface UploadTemplate {
  id: string;
  table_name: string;
  display_name: string;
  description: string;
  column_mappings: Record<string, string>;
  required_columns: string[];
  optional_columns: string[];
  validation_rules: Record<string, any>;
  sample_data: any[];
  icon: string;
  category: string;
}

export interface UploadResult {
  uploadId: string;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  errors: Array<{ row: number; error: string; data?: any }>;
}

export class BulkUploadService {
  async getTemplates(): Promise<UploadTemplate[]> {
    const { data, error } = await supabase
      .from('bulk_upload_templates')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getTemplate(tableName: string): Promise<UploadTemplate | null> {
    const { data, error } = await supabase
      .from('bulk_upload_templates')
      .select('*')
      .eq('table_name', tableName)
      .eq('is_active', true)
      .single();

    if (error) return null;
    return data;
  }

  parseXLSX(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(reader.error);
      reader.readAsBinaryString(file);
    });
  }

  async downloadTemplate(template: UploadTemplate): Promise<void> {
    const headers = [
      ...template.required_columns.map(col => template.column_mappings[col] || col),
      ...template.optional_columns.map(col => template.column_mappings[col] || col),
    ];

    const sampleData = template.sample_data.length > 0
      ? template.sample_data
      : [this.generateSampleRow(template)];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData.map(row =>
      headers.map(h => row[h] || '')
    )]);

    const columnWidths = headers.map(() => ({ wch: 20 }));
    ws['!cols'] = columnWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, template.display_name);

    XLSX.writeFile(wb, `${template.display_name}_Template.xlsx`);
    toast.success('Template downloaded');
  }

  private generateSampleRow(template: UploadTemplate): any {
    const row: any = {};
    const columnNames = Object.values(template.column_mappings);

    columnNames.forEach(colName => {
      if (colName.toLowerCase().includes('name')) row[colName] = 'Example Name';
      else if (colName.toLowerCase().includes('email')) row[colName] = 'example@email.com';
      else if (colName.toLowerCase().includes('phone')) row[colName] = '+1234567890';
      else if (colName.toLowerCase().includes('date')) row[colName] = '2024-01-01';
      else if (colName.toLowerCase().includes('price') || colName.toLowerCase().includes('cost')) row[colName] = '100.00';
      else if (colName.toLowerCase().includes('quantity')) row[colName] = '10';
      else row[colName] = 'Sample Value';
    });

    return row;
  }

  validateRow(
    row: any,
    template: UploadTemplate,
    rowIndex: number
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const reverseMapping: Record<string, string> = {};
    Object.entries(template.column_mappings).forEach(([key, value]) => {
      reverseMapping[value] = key;
    });

    template.required_columns.forEach(reqCol => {
      const displayName = template.column_mappings[reqCol] || reqCol;
      const actualCol = reverseMapping[displayName] || reqCol;

      if (!row[displayName] && !row[actualCol]) {
        errors.push(`Missing required field: ${displayName}`);
      }
    });

    Object.keys(row).forEach(key => {
      const value = row[key];
      if (value === null || value === undefined || value === '') return;

      if (key.toLowerCase().includes('email')) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push(`Invalid email format: ${value}`);
        }
      }

      if (key.toLowerCase().includes('phone')) {
        const phoneRegex = /^\+?[\d\s-()]{10,}$/;
        if (!phoneRegex.test(value)) {
          errors.push(`Invalid phone format: ${value}`);
        }
      }

      if (key.toLowerCase().includes('date')) {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          errors.push(`Invalid date format: ${value}`);
        }
      }

      if (
        key.toLowerCase().includes('price') ||
        key.toLowerCase().includes('cost') ||
        key.toLowerCase().includes('amount') ||
        key.toLowerCase().includes('quantity')
      ) {
        const num = parseFloat(value);
        if (isNaN(num)) {
          errors.push(`Invalid number format for ${key}: ${value}`);
        }
      }
    });

    return { valid: errors.length === 0, errors };
  }

  normalizeRow(row: any, template: UploadTemplate): any {
    const normalized: any = {};
    const reverseMapping: Record<string, string> = {};

    Object.entries(template.column_mappings).forEach(([key, value]) => {
      reverseMapping[value] = key;
    });

    Object.keys(row).forEach(key => {
      const dbColumn = reverseMapping[key] || key.toLowerCase().replace(/\s+/g, '_');
      let value = row[key];

      if (value === null || value === undefined || value === '') {
        return;
      }

      if (dbColumn.includes('date') && !(value instanceof Date)) {
        value = new Date(value);
      }

      if (
        (dbColumn.includes('price') ||
          dbColumn.includes('cost') ||
          dbColumn.includes('amount') ||
          dbColumn.includes('quantity')) &&
        typeof value !== 'number'
      ) {
        value = parseFloat(value);
      }

      if (dbColumn.includes('email')) {
        value = value.toLowerCase().trim();
      }

      normalized[dbColumn] = value;
    });

    return normalized;
  }

  async uploadData(
    file: File,
    template: UploadTemplate,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> {
    const startTime = Date.now();

    const { data: uploadData, error: logError } = await supabase.rpc('log_bulk_upload', {
      p_table_name: template.table_name,
      p_file_name: file.name,
      p_file_size: file.size,
      p_total_rows: 0,
    });

    if (logError) throw logError;
    const uploadId = uploadData;

    try {
      const rows = await this.parseXLSX(file);

      if (rows.length === 0) {
        throw new Error('No data found in file');
      }

      await supabase
        .from('bulk_upload_history')
        .update({ total_rows: rows.length })
        .eq('id', uploadId);

      const errors: Array<{ row: number; error: string; data?: any }> = [];
      const validRows: any[] = [];

      rows.forEach((row, index) => {
        const validation = this.validateRow(row, template, index + 2);

        if (!validation.valid) {
          errors.push({
            row: index + 2,
            error: validation.errors.join('; '),
            data: row,
          });
        } else {
          const normalized = this.normalizeRow(row, template);
          validRows.push(normalized);
        }

        if (onProgress) {
          onProgress(Math.round(((index + 1) / rows.length) * 50));
        }
      });

      let successfulRows = 0;
      const batchSize = 100;

      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize);

        const { error: insertError } = await supabase
          .from(template.table_name)
          .insert(batch);

        if (insertError) {
          batch.forEach((_, idx) => {
            errors.push({
              row: i + idx + 2,
              error: insertError.message,
              data: batch[idx],
            });
          });
        } else {
          successfulRows += batch.length;
        }

        if (onProgress) {
          onProgress(50 + Math.round(((i + batch.length) / validRows.length) * 50));
        }
      }

      const processingTime = Date.now() - startTime;
      const status =
        successfulRows === 0
          ? 'failed'
          : successfulRows === rows.length
          ? 'completed'
          : 'partially_completed';

      await supabase.rpc('update_bulk_upload_status', {
        p_upload_id: uploadId,
        p_successful_rows: successfulRows,
        p_failed_rows: errors.length,
        p_status: status,
        p_error_details: errors,
        p_processing_time_ms: processingTime,
      });

      return {
        uploadId,
        totalRows: rows.length,
        successfulRows,
        failedRows: errors.length,
        errors,
      };
    } catch (error: any) {
      await supabase.rpc('update_bulk_upload_status', {
        p_upload_id: uploadId,
        p_successful_rows: 0,
        p_failed_rows: 0,
        p_status: 'failed',
        p_error_details: [{ error: error.message }],
      });

      throw error;
    }
  }

  async getUploadHistory(limit: number = 50): Promise<any[]> {
    const { data, error } = await supabase
      .from('bulk_upload_history')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async getUploadStatistics(): Promise<any> {
    const { data, error } = await supabase
      .from('bulk_upload_statistics')
      .select('*');

    if (error) throw error;
    return data || [];
  }
}

export const bulkUploadService = new BulkUploadService();
