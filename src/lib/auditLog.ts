/**
 * Audit Logging Service
 *
 * Comprehensive logging system for tracking all user actions,
 * data changes, and security events for compliance and debugging.
 */

import { supabase } from './supabase';

/**
 * Audit log action types
 */
export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'APPROVE'
  | 'REJECT'
  | 'SUBMIT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'IMPORT'
  | 'DOWNLOAD'
  | 'UPLOAD'
  | 'SHARE'
  | 'RESTORE'
  | 'ARCHIVE';

/**
 * Entity types that can be audited
 */
export type AuditEntityType =
  | 'quotation'
  | 'customer'
  | 'product'
  | 'user'
  | 'approval'
  | 'commission'
  | 'target'
  | 'setting'
  | 'file'
  | 'report';

/**
 * Audit severity levels
 */
export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  id?: string;
  user_id: string;
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  severity?: AuditSeverity;
  created_at?: string;
}

/**
 * Field change detail interface
 */
export interface FieldChange {
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  field_type: string;
}

/**
 * Audit log filter options
 */
export interface AuditLogFilter {
  user_id?: string;
  action?: AuditAction;
  entity_type?: AuditEntityType;
  entity_id?: string;
  severity?: AuditSeverity;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

/**
 * Main Audit Logging Service
 */
class AuditLogService {
  /**
   * Log a user action
   */
  async log(entry: Omit<AuditLogEntry, 'id' | 'created_at'>): Promise<void> {
    try {
      const { error } = await supabase.from('activity_log').insert({
        user_id: entry.user_id,
        action: `${entry.action}_${entry.entity_type}`,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        details: entry.details || {},
        ip_address: entry.ip_address,
        user_agent: entry.user_agent,
      });

      if (error) {
        console.error('Failed to create audit log:', error);
        // Don't throw - logging should not break app functionality
      }
    } catch (err) {
      console.error('Audit log error:', err);
    }
  }

  /**
   * Log a CREATE action
   */
  async logCreate(
    userId: string,
    entityType: AuditEntityType,
    entityId: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      user_id: userId,
      action: 'CREATE',
      entity_type: entityType,
      entity_id: entityId,
      details,
      severity: 'info',
    });
  }

  /**
   * Log an UPDATE action with field changes
   */
  async logUpdate(
    userId: string,
    entityType: AuditEntityType,
    entityId: string,
    changes: FieldChange[],
    details?: Record<string, any>
  ): Promise<void> {
    // Create main audit log entry
    const { data: auditLog, error } = await supabase
      .from('activity_log')
      .insert({
        user_id: userId,
        action: `UPDATE_${entityType}`,
        entity_type: entityType,
        entity_id: entityId,
        details: {
          ...details,
          field_count: changes.length,
        },
      })
      .select()
      .single();

    if (error || !auditLog) {
      console.error('Failed to create audit log:', error);
      return;
    }

    // Create field-level change records
    if (changes.length > 0) {
      const detailRecords = changes.map((change) => ({
        audit_log_id: auditLog.id,
        field_name: change.field_name,
        old_value: change.old_value,
        new_value: change.new_value,
        field_type: change.field_type,
      }));

      const { error: detailError } = await supabase
        .from('audit_log_details')
        .insert(detailRecords);

      if (detailError) {
        console.error('Failed to create audit log details:', detailError);
      }
    }
  }

  /**
   * Log a DELETE action
   */
  async logDelete(
    userId: string,
    entityType: AuditEntityType,
    entityId: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      user_id: userId,
      action: 'DELETE',
      entity_type: entityType,
      entity_id: entityId,
      details,
      severity: 'warning',
    });
  }

  /**
   * Log a VIEW action (for sensitive data)
   */
  async logView(
    userId: string,
    entityType: AuditEntityType,
    entityId: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      user_id: userId,
      action: 'VIEW',
      entity_type: entityType,
      entity_id: entityId,
      details,
      severity: 'info',
    });
  }

  /**
   * Log an APPROVE action
   */
  async logApprove(
    userId: string,
    entityType: AuditEntityType,
    entityId: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      user_id: userId,
      action: 'APPROVE',
      entity_type: entityType,
      entity_id: entityId,
      details,
      severity: 'info',
    });
  }

  /**
   * Log a REJECT action
   */
  async logReject(
    userId: string,
    entityType: AuditEntityType,
    entityId: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      user_id: userId,
      action: 'REJECT',
      entity_type: entityType,
      entity_id: entityId,
      details,
      severity: 'warning',
    });
  }

  /**
   * Log user authentication
   */
  async logAuth(
    userId: string,
    action: 'LOGIN' | 'LOGOUT',
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      user_id: userId,
      action,
      entity_type: 'user',
      entity_id: userId,
      details,
      severity: action === 'LOGOUT' ? 'info' : 'info',
    });
  }

  /**
   * Log a data export
   */
  async logExport(
    userId: string,
    entityType: AuditEntityType,
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      user_id: userId,
      action: 'EXPORT',
      entity_type: entityType,
      details,
      severity: 'info',
    });
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(
    userId: string,
    event: string,
    severity: AuditSeverity = 'warning',
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      user_id: userId,
      action: 'VIEW', // Use VIEW as generic action
      entity_type: 'setting',
      details: {
        security_event: event,
        ...details,
      },
      severity,
    });
  }

  /**
   * Query audit logs with filters
   */
  async query(filter: AuditLogFilter = {}): Promise<AuditLogEntry[]> {
    try {
      let query = supabase
        .from('activity_log')
        .select(
          `
          *,
          user:profiles!activity_log_user_id_fkey(
            id,
            full_name,
            email,
            role
          )
        `
        )
        .order('created_at', { ascending: false });

      if (filter.user_id) {
        query = query.eq('user_id', filter.user_id);
      }

      if (filter.action) {
        query = query.ilike('action', `%${filter.action}%`);
      }

      if (filter.entity_type) {
        query = query.eq('entity_type', filter.entity_type);
      }

      if (filter.entity_id) {
        query = query.eq('entity_id', filter.entity_id);
      }

      if (filter.start_date) {
        query = query.gte('created_at', filter.start_date);
      }

      if (filter.end_date) {
        query = query.lte('created_at', filter.end_date);
      }

      if (filter.limit) {
        query = query.limit(filter.limit);
      }

      if (filter.offset) {
        query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to query audit logs:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Audit log query error:', err);
      return [];
    }
  }

  /**
   * Get audit log details (field-level changes)
   */
  async getDetails(auditLogId: string): Promise<FieldChange[]> {
    try {
      const { data, error } = await supabase
        .from('audit_log_details')
        .select('*')
        .eq('audit_log_id', auditLogId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to get audit log details:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Audit log details error:', err);
      return [];
    }
  }

  /**
   * Get audit history for a specific entity
   */
  async getEntityHistory(
    entityType: AuditEntityType,
    entityId: string,
    limit: number = 50
  ): Promise<AuditLogEntry[]> {
    return this.query({
      entity_type: entityType,
      entity_id: entityId,
      limit,
    });
  }

  /**
   * Get user activity history
   */
  async getUserActivity(userId: string, limit: number = 100): Promise<AuditLogEntry[]> {
    return this.query({
      user_id: userId,
      limit,
    });
  }

  /**
   * Generate audit report
   */
  async generateReport(filter: AuditLogFilter): Promise<{
    logs: AuditLogEntry[];
    summary: {
      total_actions: number;
      unique_users: number;
      actions_by_type: Record<string, number>;
      actions_by_entity: Record<string, number>;
    };
  }> {
    const logs = await this.query(filter);

    const uniqueUsers = new Set(logs.map((log) => log.user_id)).size;
    const actionsByType: Record<string, number> = {};
    const actionsByEntity: Record<string, number> = {};

    logs.forEach((log) => {
      actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;
      actionsByEntity[log.entity_type] = (actionsByEntity[log.entity_type] || 0) + 1;
    });

    return {
      logs,
      summary: {
        total_actions: logs.length,
        unique_users: uniqueUsers,
        actions_by_type: actionsByType,
        actions_by_entity: actionsByEntity,
      },
    };
  }

  /**
   * Calculate differences between two objects
   */
  calculateChanges<T extends Record<string, any>>(
    oldData: T,
    newData: T,
    excludeFields: string[] = []
  ): FieldChange[] {
    const changes: FieldChange[] = [];
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    allKeys.forEach((key) => {
      if (excludeFields.includes(key)) return;

      const oldValue = oldData[key];
      const newValue = newData[key];

      if (oldValue !== newValue) {
        changes.push({
          field_name: key,
          old_value: oldValue != null ? String(oldValue) : null,
          new_value: newValue != null ? String(newValue) : null,
          field_type: typeof newValue,
        });
      }
    });

    return changes;
  }
}

// Export singleton instance
export const auditLog = new AuditLogService();

/**
 * React hook for audit logging
 */
export function useAuditLog() {
  return auditLog;
}
