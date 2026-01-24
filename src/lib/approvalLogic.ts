import { supabase } from './supabase';
import type { Database } from './database.types';

type QuotationStatus = Database['public']['Tables']['quotations']['Row']['status'];
type Quotation = Database['public']['Tables']['quotations']['Row'];
// QuotationItem is used in inferred types, keeping it for reference even if unused in explicit annotations
// type QuotationItem = Database['public']['Tables']['quotation_items']['Row'];

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

  const { data: quotation, error: quotationError } = await (supabase
    .from('quotations')
    .select('*, quotation_items(*)')
    .eq('id', quotationId)
    .single() as any);

  if (quotationError || !quotation) {
    return { valid: false, errors: ['Quotation not found'] };
  }

  // Cast to any to access joined properties
  const q = quotation as any;

  if (!q.quotation_items || q.quotation_items.length === 0) {
    errors.push('Quotation must have at least one line item');
  }

  // Check for custom items or items with modifications that are still pending pricing
  const pendingCustomItems = q.quotation_items?.filter(
    (item: any) =>
      (item.is_custom || item.needs_engineering_review) &&
      item.custom_item_status === 'pending'
  );

  if (pendingCustomItems && pendingCustomItems.length > 0) {
    errors.push(
      `${pendingCustomItems.length} item(s) are still awaiting engineering pricing`
    );
  }

  if (!q.customer_id) {
    errors.push('Customer is required');
  }

  if (!q.title) {
    errors.push('Quotation title is required');
  }

  if (q.total <= 0) {
    errors.push('Quotation total must be greater than zero');
  }

  // Validate discount percentage based on user role
  const { data: profile } = await (supabase
    .from('profiles')
    .select('role')
    .eq('id', q.sales_rep_id)
    .single() as any);

  if (profile?.role === 'sales' && q.discount_percentage > 5) {
    errors.push('Sales representatives can only apply discounts up to 5%. Please reduce the discount or request manager approval.');
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

  // Cast rules to any[] to avoid strict type checking on numeric fields that might come as strings from DB
  const rulesList = rules as any[];

  for (const rule of rulesList) {
    const minValue = parseFloat(String(rule.min_quotation_value));
    const maxValue = rule.max_quotation_value ? parseFloat(String(rule.max_quotation_value)) : null;

    if (quotationValue >= minValue && (maxValue === null || quotationValue < maxValue)) {
      return {
        min_quotation_value: minValue,
        max_quotation_value: maxValue,
        max_discount_percentage: parseFloat(String(rule.max_discount_percentage)),
        requires_ceo_approval: rule.requires_ceo_approval,
      };
    }
  }

  const lastRule = rulesList[rulesList.length - 1];
  return {
    min_quotation_value: parseFloat(String(lastRule.min_quotation_value)),
    max_quotation_value: lastRule.max_quotation_value ? parseFloat(String(lastRule.max_quotation_value)) : null,
    max_discount_percentage: parseFloat(String(lastRule.max_discount_percentage)),
    requires_ceo_approval: lastRule.requires_ceo_approval,
  };
}

export async function determineNextApprovalStatus(
  quotation: Quotation
): Promise<{ status: QuotationStatus; requiresCEO: boolean; requiresFinance: boolean; requiresParallel: boolean }> {
  const discountPercentage = quotation.discount_percentage || 0;
  const totalValue = quotation.total || 0;

  // Get configuration from system settings
  const { data: settings } = await (supabase
    .from('system_settings')
    .select('*')
    .in('key', ['high_value_threshold', 'parallel_approval_threshold']) as any);

  const highValueThreshold = parseFloat(settings?.find((s: any) => s.key === 'high_value_threshold')?.value || '100000');
  const parallelThreshold = parseFloat(settings?.find((s: any) => s.key === 'parallel_approval_threshold')?.value || '500000');

  // Rules:
  // 1. Discount > 10% requires CEO approval
  // 2. Total Value > High Value requires Finance approval
  // 3. Total Value > Parallel Threshold triggers simultaneous notification
  const requiresCEO = discountPercentage > 10;
  const requiresFinance = totalValue > highValueThreshold;
  const requiresParallel = totalValue > parallelThreshold;

  // Status mapping
  let status: QuotationStatus = 'pending_manager';

  if (requiresParallel && requiresCEO) {
    status = 'pending_ceo'; // Both notified, but CEO is primary
  }

  return { status, requiresCEO, requiresFinance, requiresParallel };
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

  const { data: quotation, error: quotationError } = await (supabase
    .from('quotations')
    .select('*')
    .eq('id', quotationId)
    .single() as any);

  if (quotationError || !quotation) {
    return {
      success: false,
      nextStatus: 'draft',
      requiresCEO: false,
      error: 'Failed to load quotation',
    };
  }

  const { status: nextStatus, requiresCEO, requiresFinance, requiresParallel } = await determineNextApprovalStatus(quotation);

  // Don't await AI prediction, let it run in the background
  callAIPredictionService(quotationId, quotation).catch(err =>
    console.error('Non-blocking AI prediction error:', err)
  );

  // Set SLA targets (e.g., 24h for manager, 48h for CEO/Finance)
  const targetDate = new Date();
  targetDate.setHours(targetDate.getHours() + (requiresCEO ? 48 : 24));

  const { error: updateError } = await ((supabase as any)
    .from('quotations')
    .update({
      status: nextStatus,
      submitted_at: new Date().toISOString(),
      requires_parallel_approval: requiresParallel,
      target_approval_date: targetDate.toISOString(),
    })
    .eq('id', quotationId));

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
      requires_ceo: requiresCEO,
      requires_finance: requiresFinance,
    },
  } as any);

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

async function callAIPredictionService(quotationId: string, quotation: Quotation) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/predict-approval-path`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        quotationId,
        quotationValue: quotation.total,
        discountPercentage: quotation.discount_percentage,
        salesRepId: quotation.sales_rep_id,
        customerId: quotation.customer_id,
      }),
    });

    if (!response.ok) {
      console.error('AI prediction service failed:', await response.text());
    }
  } catch (error) {
    console.error('Error calling AI prediction service:', error);
  }
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

  const { data: approvers } = await (supabase
    .from('profiles')
    .select('id')
    .eq('role', targetRole) as any);

  if (approvers && approvers.length > 0) {
    const notifications = approvers.map((approver: any) => ({
      user_id: approver.id,
      type: 'quotation_submitted' as const,
      title,
      message: `Quotation ${quotation.quotation_number} for $${quotation.total.toFixed(2)} requires your approval`,
      link: `/approvals`,
      related_quotation_id: quotationId,
      is_read: false,
    }));

    await supabase.from('notifications').insert(notifications as any);
  }
}

export async function approveQuotation(
  quotationId: string,
  approverId: string,
  approverRole: string,
  comments?: string
): Promise<{ success: boolean; nextStatus: QuotationStatus; error?: string }> {
  const { data: quotation, error: quotationError } = await (supabase
    .from('quotations')
    .select('*')
    .eq('id', quotationId)
    .single() as any);

  if (quotationError || !quotation) {
    return { success: false, nextStatus: 'draft', error: 'Quotation not found' };
  }

  let nextStatus: QuotationStatus;
  const previousStatus = quotation.status;

  if (approverRole === 'manager') {
    const discountPercentage = quotation.discount_percentage || 0;
    const totalValue = quotation.total || 0;

    // Get high value threshold
    const { data: setting } = await (supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'high_value_threshold')
      .maybeSingle() as any);

    const highValueThreshold = setting ? parseFloat(String(setting.value)) : 100000;

    // Manager can approve up to 10%
    if (discountPercentage > 10) {
      // Discount >10% requires CEO approval
      nextStatus = 'pending_ceo';
    } else if (totalValue > highValueThreshold) {
      // High value requires Finance approval after Manager
      nextStatus = 'pending_finance';
    } else {
      // Discount ≤10% and low value, manager can approve fully
      nextStatus = 'approved';
    }
  } else if (approverRole === 'ceo') {
    // CEO can approve any discount, send to finance if needed OR if total value is high
    // Actually, for consistency, CEO approval always flows to finance review
    nextStatus = 'pending_finance';
  } else if (approverRole === 'finance') {
    // Finance final approval
    nextStatus = 'approved';
  } else {
    return { success: false, nextStatus: previousStatus, error: 'Invalid approver role' };
  }

  const updateData: any = {
    status: nextStatus,
  };

  // Set approved_at when manager approves (for non-CEO approvals)
  if (approverRole === 'manager' && nextStatus === 'approved') {
    updateData.approved_at = new Date().toISOString();
  }

  // Set finance_approved_at when finance approves
  if (approverRole === 'finance') {
    updateData.finance_approved_at = new Date().toISOString();
    updateData.approved_at = new Date().toISOString(); // Also set final approval time
  }

  const { error: updateError } = await ((supabase as any)
    .from('quotations')
    .update(updateData)
    .eq('id', quotationId));

  if (updateError) {
    return { success: false, nextStatus: previousStatus, error: 'Failed to update quotation' };
  }

  await supabase.from('quotation_approvals').insert({
    quotation_id: quotationId,
    approver_id: approverId,
    approver_role: approverRole,
    action: 'approved',
    comments,
    previous_status: previousStatus,
    new_status: nextStatus,
  } as any);

  const { data: salesRep } = await (supabase
    .from('quotations')
    .select('sales_rep_id')
    .eq('id', quotationId)
    .single() as any);

  // Notify sales rep
  if (salesRep) {
    await supabase.from('notifications').insert({
      user_id: salesRep.sales_rep_id,
      type: 'quotation_approved',
      title: 'Quotation Approved',
      message: `Your quotation ${quotation.quotation_number} has been approved by ${approverRole}`,
      link: `/quotations`,
      related_quotation_id: quotationId,
      is_read: false,
    } as any);
  }

  // Notify finance team when CEO approves
  if (approverRole === 'ceo' && nextStatus === 'pending_finance') {
    const { data: financeUsers } = await (supabase
      .from('profiles')
      .select('user_id')
      .eq('role', 'finance') as any);

    if (financeUsers && financeUsers.length > 0) {
      const notifications = financeUsers.map((user: any) => ({
        user_id: user.user_id,
        type: 'quotation_submitted' as const,
        title: 'Quotation Pending Finance Approval',
        message: `Quotation ${quotation.quotation_number} requires your financial review`,
        link: `/approvals`,
        related_quotation_id: quotationId,
        is_read: false,
      }));

      await supabase.from('notifications').insert(notifications as any);
    }
  }

  return { success: true, nextStatus };
}

export async function rejectQuotation(
  quotationId: string,
  approverId: string,
  approverRole: string,
  comments: string
): Promise<{ success: boolean; error?: string }> {
  const { data: quotation, error: quotationError } = await (supabase
    .from('quotations')
    .select('*')
    .eq('id', quotationId)
    .single() as any);

  if (quotationError || !quotation) {
    return { success: false, error: 'Quotation not found' };
  }

  const previousStatus = quotation.status;
  const nextStatus: QuotationStatus = 'rejected';

  const { error: updateError } = await ((supabase as any)
    .from('quotations')
    .update({ status: nextStatus })
    .eq('id', quotationId));

  if (updateError) {
    return { success: false, error: 'Failed to update quotation' };
  }

  await supabase.from('quotation_approvals').insert({
    quotation_id: quotationId,
    approver_id: approverId,
    approver_role: approverRole,
    action: 'rejected',
    comments,
    previous_status: previousStatus,
    new_status: nextStatus,
  } as any);

  const { data: salesRep } = await (supabase
    .from('quotations')
    .select('sales_rep_id')
    .eq('id', quotationId)
    .single() as any);

  if (salesRep) {
    await supabase.from('notifications').insert({
      user_id: salesRep.sales_rep_id,
      type: 'quotation_rejected',
      title: 'Quotation Rejected',
      message: `Your quotation ${quotation.quotation_number} has been rejected by ${approverRole}`,
      link: `/quotations`,
      related_quotation_id: quotationId,
      is_read: false,
    } as any);
  }

  return { success: true };
}

export async function requestChanges(
  quotationId: string,
  approverId: string,
  approverRole: string,
  comments: string
): Promise<{ success: boolean; error?: string }> {
  const { data: quotation, error: quotationError } = await (supabase
    .from('quotations')
    .select('*')
    .eq('id', quotationId)
    .single() as any);

  if (quotationError || !quotation) {
    return { success: false, error: 'Quotation not found' };
  }

  const previousStatus = quotation.status;
  const nextStatus: QuotationStatus = 'changes_requested';

  const { error: updateError } = await ((supabase as any)
    .from('quotations')
    .update({ status: nextStatus })
    .eq('id', quotationId));

  if (updateError) {
    return { success: false, error: 'Failed to update quotation' };
  }

  await supabase.from('quotation_approvals').insert({
    quotation_id: quotationId,
    approver_id: approverId,
    approver_role: approverRole,
    action: 'changes_requested',
    comments,
    previous_status: previousStatus,
    new_status: nextStatus,
  } as any);

  const { data: salesRep } = await (supabase
    .from('quotations')
    .select('sales_rep_id')
    .eq('id', quotationId)
    .single() as any);

  if (salesRep) {
    await supabase.from('notifications').insert({
      user_id: (salesRep as any).sales_rep_id,
      type: 'changes_requested',
      title: 'Changes Requested',
      message: `${approverRole} has requested changes to quotation ${quotation.quotation_number}`,
      link: `/quotations`,
      related_quotation_id: quotationId,
      is_read: false,
    } as any);
  }

  return { success: true };
}
