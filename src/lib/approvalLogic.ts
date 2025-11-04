import { supabase } from './supabase';
import type { Database } from './database.types';

type QuotationStatus = Database['public']['Tables']['quotations']['Row']['status'];
type Quotation = Database['public']['Tables']['quotations']['Row'];

interface DiscountMatrixRule {
  min_quotation_value: number;
  max_quotation_value: number | null;
  max_discount_percentage: number;
  requires_ceo_approval: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

interface SubmissionResult {
  success: boolean;
  nextStatus: QuotationStatus;
  requiresCEO: boolean;
  error?: string;
}

export async function validateQuotationForSubmission(
  quotationId: string
): Promise<ValidationResult> {
  const errors: string[] = [];

  const { data: quotation, error: quotationError } = await supabase
    .from('quotations')
    .select('*, quotation_items(*)')
    .eq('id', quotationId)
    .single();

  if (quotationError || !quotation) {
    return { valid: false, errors: ['Quotation not found'] };
  }

  if (!quotation.quotation_items || quotation.quotation_items.length === 0) {
    errors.push('Quotation must have at least one line item');
  }

  const pendingCustomItems = quotation.quotation_items?.filter(
    (item: any) => item.is_custom && item.custom_item_status === 'pending'
  );

  if (pendingCustomItems && pendingCustomItems.length > 0) {
    errors.push(
      `${pendingCustomItems.length} custom item(s) are still awaiting engineering pricing`
    );
  }

  if (!quotation.customer_id) {
    errors.push('Customer is required');
  }

  if (!quotation.title) {
    errors.push('Quotation title is required');
  }

  if (quotation.total <= 0) {
    errors.push('Quotation total must be greater than zero');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export async function getDiscountMatrixRule(
  quotationValue: number
): Promise<DiscountMatrixRule | null> {
  const { data: rules } = await supabase
    .from('discount_matrix')
    .select('*')
    .order('min_quotation_value', { ascending: true });

  if (!rules || rules.length === 0) {
    return null;
  }

  for (const rule of rules) {
    const minValue = parseFloat(rule.min_quotation_value as any);
    const maxValue = rule.max_quotation_value ? parseFloat(rule.max_quotation_value as any) : null;

    if (quotationValue >= minValue && (maxValue === null || quotationValue < maxValue)) {
      return {
        min_quotation_value: minValue,
        max_quotation_value: maxValue,
        max_discount_percentage: parseFloat(rule.max_discount_percentage as any),
        requires_ceo_approval: rule.requires_ceo_approval,
      };
    }
  }

  return rules[rules.length - 1] as any;
}

export async function determineNextApprovalStatus(
  quotation: Quotation
): Promise<{ status: QuotationStatus; requiresCEO: boolean }> {
  const rule = await getDiscountMatrixRule(quotation.total);

  if (!rule) {
    return { status: 'pending_manager', requiresCEO: false };
  }

  const discountExceedsLimit = quotation.discount_percentage > rule.max_discount_percentage;
  const requiresCEO = rule.requires_ceo_approval || discountExceedsLimit;

  if (requiresCEO) {
    return { status: 'pending_ceo', requiresCEO: true };
  } else {
    return { status: 'pending_manager', requiresCEO: false };
  }
}

export async function submitQuotationForApproval(
  quotationId: string,
  userId: string
): Promise<SubmissionResult> {
  const validation = await validateQuotationForSubmission(quotationId);

  if (!validation.valid) {
    return {
      success: false,
      nextStatus: 'draft',
      requiresCEO: false,
      error: validation.errors.join(', '),
    };
  }

  const { data: quotation, error: quotationError } = await supabase
    .from('quotations')
    .select('*')
    .eq('id', quotationId)
    .single();

  if (quotationError || !quotation) {
    return {
      success: false,
      nextStatus: 'draft',
      requiresCEO: false,
      error: 'Failed to load quotation',
    };
  }

  const { status: nextStatus, requiresCEO } = await determineNextApprovalStatus(quotation);

  const { error: updateError } = await supabase
    .from('quotations')
    .update({
      status: nextStatus,
      submitted_at: new Date().toISOString(),
    })
    .eq('id', quotationId);

  if (updateError) {
    return {
      success: false,
      nextStatus: 'draft',
      requiresCEO: false,
      error: 'Failed to update quotation status',
    };
  }

  const { error: logError } = await supabase.from('activity_log').insert({
    user_id: userId,
    action: 'quotation_submitted',
    entity_type: 'quotation',
    entity_id: quotationId,
    details: {
      previous_status: quotation.status,
      new_status: nextStatus,
      total: quotation.total,
      discount_percentage: quotation.discount_percentage,
    },
  });

  if (logError) {
    console.error('Failed to log activity:', logError);
  }

  await createNotificationsForSubmission(quotationId, nextStatus, quotation);

  return {
    success: true,
    nextStatus,
    requiresCEO,
  };
}

async function createNotificationsForSubmission(
  quotationId: string,
  status: QuotationStatus,
  quotation: Quotation
) {
  let targetRole: string;
  let title: string;

  if (status === 'pending_manager') {
    targetRole = 'manager';
    title = 'New Quotation Pending Your Approval';
  } else if (status === 'pending_ceo') {
    targetRole = 'ceo';
    title = 'New Quotation Requires CEO Approval';
  } else {
    return;
  }

  const { data: approvers } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', targetRole);

  if (approvers && approvers.length > 0) {
    const notifications = approvers.map((approver) => ({
      user_id: approver.id,
      type: 'quotation_submitted' as const,
      title,
      message: `Quotation ${quotation.quotation_number} for $${quotation.total.toFixed(2)} requires your approval`,
      link: `/approvals`,
      related_quotation_id: quotationId,
      is_read: false,
    }));

    await supabase.from('notifications').insert(notifications);
  }
}

export async function approveQuotation(
  quotationId: string,
  approverId: string,
  approverRole: string,
  comments?: string
): Promise<{ success: boolean; nextStatus: QuotationStatus; error?: string }> {
  const { data: quotation, error: quotationError } = await supabase
    .from('quotations')
    .select('*')
    .eq('id', quotationId)
    .single();

  if (quotationError || !quotation) {
    return { success: false, nextStatus: 'draft', error: 'Quotation not found' };
  }

  let nextStatus: QuotationStatus;
  const previousStatus = quotation.status;

  if (approverRole === 'manager') {
    nextStatus = 'approved';
  } else if (approverRole === 'ceo') {
    nextStatus = 'pending_finance';
  } else {
    return { success: false, nextStatus: previousStatus, error: 'Invalid approver role' };
  }

  const { error: updateError } = await supabase
    .from('quotations')
    .update({
      status: nextStatus,
      approved_at: approverRole === 'manager' ? new Date().toISOString() : quotation.approved_at,
    })
    .eq('id', quotationId);

  if (updateError) {
    return { success: false, nextStatus: previousStatus, error: 'Failed to update quotation' };
  }

  await supabase.from('quotation_approvals').insert({
    quotation_id: quotationId,
    approver_id: approverId,
    approver_role: approverRole as any,
    action: 'approved',
    comments,
    previous_status: previousStatus,
    new_status: nextStatus,
  });

  const { data: salesRep } = await supabase
    .from('quotations')
    .select('sales_rep_id')
    .eq('id', quotationId)
    .single();

  if (salesRep) {
    await supabase.from('notifications').insert({
      user_id: salesRep.sales_rep_id,
      type: 'quotation_approved',
      title: 'Quotation Approved',
      message: `Your quotation ${quotation.quotation_number} has been approved by ${approverRole}`,
      link: `/quotations`,
      related_quotation_id: quotationId,
      is_read: false,
    });
  }

  return { success: true, nextStatus };
}

export async function rejectQuotation(
  quotationId: string,
  approverId: string,
  approverRole: string,
  comments: string
): Promise<{ success: boolean; error?: string }> {
  const { data: quotation, error: quotationError } = await supabase
    .from('quotations')
    .select('*')
    .eq('id', quotationId)
    .single();

  if (quotationError || !quotation) {
    return { success: false, error: 'Quotation not found' };
  }

  const previousStatus = quotation.status;
  const nextStatus: QuotationStatus = 'rejected';

  const { error: updateError } = await supabase
    .from('quotations')
    .update({ status: nextStatus })
    .eq('id', quotationId);

  if (updateError) {
    return { success: false, error: 'Failed to update quotation' };
  }

  await supabase.from('quotation_approvals').insert({
    quotation_id: quotationId,
    approver_id: approverId,
    approver_role: approverRole as any,
    action: 'rejected',
    comments,
    previous_status: previousStatus,
    new_status: nextStatus,
  });

  const { data: salesRep } = await supabase
    .from('quotations')
    .select('sales_rep_id')
    .eq('id', quotationId)
    .single();

  if (salesRep) {
    await supabase.from('notifications').insert({
      user_id: salesRep.sales_rep_id,
      type: 'quotation_rejected',
      title: 'Quotation Rejected',
      message: `Your quotation ${quotation.quotation_number} has been rejected by ${approverRole}`,
      link: `/quotations`,
      related_quotation_id: quotationId,
      is_read: false,
    });
  }

  return { success: true };
}

export async function requestChanges(
  quotationId: string,
  approverId: string,
  approverRole: string,
  comments: string
): Promise<{ success: boolean; error?: string }> {
  const { data: quotation, error: quotationError } = await supabase
    .from('quotations')
    .select('*')
    .eq('id', quotationId)
    .single();

  if (quotationError || !quotation) {
    return { success: false, error: 'Quotation not found' };
  }

  const previousStatus = quotation.status;
  const nextStatus: QuotationStatus = 'changes_requested';

  const { error: updateError } = await supabase
    .from('quotations')
    .update({ status: nextStatus })
    .eq('id', quotationId);

  if (updateError) {
    return { success: false, error: 'Failed to update quotation' };
  }

  await supabase.from('quotation_approvals').insert({
    quotation_id: quotationId,
    approver_id: approverId,
    approver_role: approverRole as any,
    action: 'changes_requested',
    comments,
    previous_status: previousStatus,
    new_status: nextStatus,
  });

  const { data: salesRep } = await supabase
    .from('quotations')
    .select('sales_rep_id')
    .eq('id', quotationId)
    .single();

  if (salesRep) {
    await supabase.from('notifications').insert({
      user_id: salesRep.sales_rep_id,
      type: 'changes_requested',
      title: 'Changes Requested',
      message: `${approverRole} has requested changes to quotation ${quotation.quotation_number}`,
      link: `/quotations`,
      related_quotation_id: quotationId,
      is_read: false,
    });
  }

  return { success: true };
}
