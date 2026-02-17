import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export interface FinanceReview {
  id: string;
  quotation_id: string;
  reviewer_id: string;
  review_status: 'pending' | 'approved' | 'flagged' | 'rejected';
  cost_concerns?: string;
  profit_margin_ok: boolean;
  profit_margin_percentage?: number;
  notes?: string;
  reviewed_at: string;
}

export interface BudgetPeriod {
  id: string;
  period_name: string;
  period_start: string;
  period_end: string;
  allocated_budget: number;
  spent_amount: number;
  category: string;
  department?: string;
  notes?: string;
}

export interface CommissionApproval {
  id: string;
  calculation_id: string;
  reviewer_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'on_hold';
  notes?: string;
  approved_at?: string;
}

/**
 * Hook to get finance dashboard metrics
 */
export function useFinanceMetrics(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['finance-metrics', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_finance_dashboard_metrics', {
        p_start_date: startDate || null,
        p_end_date: endDate || null,
      });

      if (error) throw error;
      return data;
    },
  });
}

/**
 * Hook to get quotation profit margin
 */
export function useQuotationProfitMargin(quotationId: string) {
  return useQuery({
    queryKey: ['quotation-profit-margin', quotationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('calculate_quotation_profit_margin', {
        quotation_id_param: quotationId,
      });

      if (error) throw error;
      return data;
    },
    enabled: !!quotationId,
  });
}

/**
 * Hook to get finance quotation summary
 */
export function useFinanceQuotations(filters?: {
  startDate?: string;
  endDate?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['finance-quotations', filters],
    queryFn: async () => {
      let query = supabase
        .from('finance_quotation_summary')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Hook to create or update finance review
 */
export function useCreateFinanceReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (review: Omit<FinanceReview, 'id' | 'reviewed_at'>) => {
      const { data, error } = await supabase
        .from('finance_reviews')
        .upsert(review)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-quotations'] });
      queryClient.invalidateQueries({ queryKey: ['finance-reviews'] });
      toast.success('Finance review saved');
    },
    onError: (error: any) => {
      toast.error('Failed to save review: ' + error.message);
    },
  });
}

/**
 * Hook to get finance reviews
 */
export function useFinanceReviews(quotationId?: string) {
  return useQuery({
    queryKey: ['finance-reviews', quotationId],
    queryFn: async () => {
      let query = supabase
        .from('finance_reviews')
        .select('*, reviewer:profiles!finance_reviews_reviewer_id_fkey(full_name)')
        .order('reviewed_at', { ascending: false });

      if (quotationId) {
        query = query.eq('quotation_id', quotationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Hook to approve commission
 */
export function useApproveCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      calculationId,
      reviewerId,
      notes,
    }: {
      calculationId: string;
      reviewerId: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('commission_approvals')
        .upsert({
          calculation_id: calculationId,
          reviewer_id: reviewerId,
          status: 'approved',
          notes,
          approved_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['finance-metrics'] });
      toast.success('Commission approved');
    },
    onError: (error: any) => {
      toast.error('Failed to approve commission: ' + error.message);
    },
  });
}

/**
 * Hook to reject commission
 */
export function useRejectCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      calculationId,
      reviewerId,
      notes,
    }: {
      calculationId: string;
      reviewerId: string;
      notes: string;
    }) => {
      const { data, error } = await supabase
        .from('commission_approvals')
        .upsert({
          calculation_id: calculationId,
          reviewer_id: reviewerId,
          status: 'rejected',
          notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['finance-metrics'] });
      toast.success('Commission rejected');
    },
    onError: (error: any) => {
      toast.error('Failed to reject commission: ' + error.message);
    },
  });
}

/**
 * Hook to get commission approvals
 */
export function useCommissionApprovals(status?: string) {
  return useQuery({
    queryKey: ['commission-approvals', status],
    queryFn: async () => {
      let query = supabase
        .from('commission_approvals')
        .select(`
          *,
          calculation:commission_calculations!commission_approvals_calculation_id_fkey(
            *,
            user:profiles!commission_calculations_user_id_fkey(full_name, email)
          ),
          reviewer:profiles!commission_approvals_reviewer_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Hook to manage budget periods
 */
export function useBudgetPeriods() {
  return useQuery({
    queryKey: ['budget-periods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_periods')
        .select('*')
        .order('period_start', { ascending: false });

      if (error) throw error;
      return data as BudgetPeriod[];
    },
  });
}

/**
 * Hook to create budget period
 */
export function useCreateBudgetPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (budget: Omit<BudgetPeriod, 'id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('budget_periods')
        .insert([{ ...budget, created_by: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-periods'] });
      toast.success('Budget period created');
    },
    onError: (error: any) => {
      toast.error('Failed to create budget period: ' + error.message);
    },
  });
}

/**
 * Hook to get financial metrics history
 */
export function useFinancialMetrics(filters?: {
  category?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['financial-metrics', filters],
    queryFn: async () => {
      let query = supabase
        .from('financial_metrics')
        .select('*')
        .order('calculated_at', { ascending: false });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.startDate) {
        query = query.gte('period_start', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('period_end', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Hook to get low margin quotations
 */
export function useLowMarginQuotations(threshold: number = 20) {
  return useQuery({
    queryKey: ['low-margin-quotations', threshold],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_quotation_summary')
        .select('*')
        .lt('profit_margin_percentage', threshold)
        .eq('status', 'approved')
        .order('profit_margin_percentage', { ascending: true })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });
}

// ============================================================================
// GENERAL LEDGER HOOKS
// ============================================================================

export interface ChartOfAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'cost_of_sales';
  account_subtype: string;
  parent_account_id?: string;
  is_active: boolean;
  current_balance: number;
  opening_balance: number;
  level: number;
}

export interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  fiscal_period_id?: string;
  entry_type: 'standard' | 'adjusting' | 'closing' | 'reversing' | 'opening';
  description: string;
  total_debit: number;
  total_credit: number;
  status: 'draft' | 'posted' | 'reversed' | 'voided';
  created_by: string;
}

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  line_number: number;
  account_id: string;
  cost_center_id?: string;
  description?: string;
  debit_amount: number;
  credit_amount: number;
}

export function useChartOfAccounts(accountType?: string) {
  return useQuery({
    queryKey: ['chart-of-accounts', accountType],
    queryFn: async () => {
      let query = supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .order('account_code');

      if (accountType) {
        query = query.eq('account_type', accountType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ChartOfAccount[];
    },
  });
}

export function useJournalEntries(filters?: { startDate?: string; endDate?: string; status?: string }) {
  return useQuery({
    queryKey: ['journal-entries', filters],
    queryFn: async () => {
      let query = supabase
        .from('journal_entries')
        .select('*, created_by_profile:profiles!journal_entries_created_by_fkey(full_name)')
        .order('entry_date', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('entry_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('entry_date', filters.endDate);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: Omit<JournalEntry, 'id'> & { lines: Omit<JournalEntryLine, 'id' | 'journal_entry_id'>[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { lines, ...entryData } = entry;

      const { data: journalEntry, error: entryError } = await supabase
        .from('journal_entries')
        .insert([{ ...entryData, created_by: user.id }])
        .select()
        .single();

      if (entryError) throw entryError;

      const linesWithJournalId = lines.map((line, index) => ({
        ...line,
        journal_entry_id: journalEntry.id,
        line_number: index + 1,
      }));

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(linesWithJournalId);

      if (linesError) throw linesError;

      return journalEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success('Journal entry created');
    },
    onError: (error: any) => {
      toast.error('Failed to create journal entry: ' + error.message);
    },
  });
}

export function usePostJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string) => {
      const { data, error } = await supabase.rpc('post_journal_entry', { entry_id: entryId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success('Journal entry posted');
    },
    onError: (error: any) => {
      toast.error('Failed to post journal entry: ' + error.message);
    },
  });
}

// ============================================================================
// FISCAL PERIODS HOOKS
// ============================================================================

export interface FiscalPeriod {
  id: string;
  fiscal_year: number;
  period_number: number;
  period_name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
}

export function useFiscalPeriods(fiscalYear?: number) {
  return useQuery({
    queryKey: ['fiscal-periods', fiscalYear],
    queryFn: async () => {
      let query = supabase
        .from('fiscal_periods')
        .select('*')
        .order('fiscal_year', { ascending: false })
        .order('period_number', { ascending: true });

      if (fiscalYear) {
        query = query.eq('fiscal_year', fiscalYear);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FiscalPeriod[];
    },
  });
}

// ============================================================================
// ACCOUNTS RECEIVABLE HOOKS
// ============================================================================

export interface CreditNote {
  id: string;
  credit_note_number: string;
  customer_id: string;
  invoice_id?: string;
  credit_note_date: string;
  reason: string;
  credit_amount: number;
  tax_amount: number;
  total_amount: number;
  status: 'draft' | 'approved' | 'applied' | 'voided';
}

export function useCreditNotes(customerId?: string) {
  return useQuery({
    queryKey: ['credit-notes', customerId],
    queryFn: async () => {
      let query = supabase
        .from('credit_notes')
        .select('*, customer:customers(company_name)')
        .order('credit_note_date', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCreditNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (creditNote: Omit<CreditNote, 'id' | 'total_amount'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('credit_notes')
        .insert([{ ...creditNote, created_by: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-notes'] });
      toast.success('Credit note created');
    },
    onError: (error: any) => {
      toast.error('Failed to create credit note: ' + error.message);
    },
  });
}

export function useARAgingReport() {
  return useQuery({
    queryKey: ['ar-aging-report'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('calculate_ar_aging');
      if (error) throw error;
      return data;
    },
  });
}

// ============================================================================
// ACCOUNTS PAYABLE HOOKS
// ============================================================================

export interface DebitNote {
  id: string;
  debit_note_number: string;
  supplier_id: string;
  purchase_order_id?: string;
  debit_note_date: string;
  reason: string;
  debit_amount: number;
  tax_amount: number;
  total_amount: number;
  status: 'draft' | 'approved' | 'applied' | 'voided';
}

export function useDebitNotes(supplierId?: string) {
  return useQuery({
    queryKey: ['debit-notes', supplierId],
    queryFn: async () => {
      let query = supabase
        .from('debit_notes')
        .select('*, supplier:suppliers(supplier_name)')
        .order('debit_note_date', { ascending: false });

      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDebitNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (debitNote: Omit<DebitNote, 'id' | 'total_amount'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('debit_notes')
        .insert([{ ...debitNote, created_by: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debit-notes'] });
      toast.success('Debit note created');
    },
    onError: (error: any) => {
      toast.error('Failed to create debit note: ' + error.message);
    },
  });
}

// ============================================================================
// FIXED ASSETS HOOKS
// ============================================================================

export interface FixedAsset {
  id: string;
  asset_code: string;
  asset_name: string;
  asset_category_id: string;
  purchase_date: string;
  purchase_cost: number;
  residual_value: number;
  useful_life_years: number;
  depreciation_method: string;
  status: 'active' | 'under_maintenance' | 'disposed' | 'retired' | 'sold';
}

export function useFixedAssets(status?: string) {
  return useQuery({
    queryKey: ['fixed-assets', status],
    queryFn: async () => {
      let query = supabase
        .from('fixed_assets')
        .select('*, category:asset_categories(category_name)')
        .order('purchase_date', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateFixedAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (asset: Omit<FixedAsset, 'id'>) => {
      const { data, error } = await supabase
        .from('fixed_assets')
        .insert([asset])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] });
      toast.success('Fixed asset created');
    },
    onError: (error: any) => {
      toast.error('Failed to create fixed asset: ' + error.message);
    },
  });
}

// ============================================================================
// COST CENTERS HOOKS
// ============================================================================

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  description?: string;
  manager_id?: string;
  is_active: boolean;
  budget_amount?: number;
}

export function useCostCenters() {
  return useQuery({
    queryKey: ['cost-centers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('*, manager:profiles(full_name)')
        .eq('is_active', true)
        .order('code');

      if (error) throw error;
      return data as CostCenter[];
    },
  });
}

export function useCreateCostCenter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (costCenter: Omit<CostCenter, 'id'>) => {
      const { data, error } = await supabase
        .from('cost_centers')
        .insert([costCenter])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-centers'] });
      toast.success('Cost center created');
    },
    onError: (error: any) => {
      toast.error('Failed to create cost center: ' + error.message);
    },
  });
}

// ============================================================================
// MULTI-CURRENCY HOOKS
// ============================================================================

export interface ExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  rate_date: string;
  rate_type: 'spot' | 'budget' | 'average';
}

export function useExchangeRates(fromCurrency?: string, toCurrency?: string) {
  return useQuery({
    queryKey: ['exchange-rates', fromCurrency, toCurrency],
    queryFn: async () => {
      let query = supabase
        .from('exchange_rates')
        .select('*')
        .order('rate_date', { ascending: false })
        .limit(100);

      if (fromCurrency) {
        query = query.eq('from_currency', fromCurrency);
      }
      if (toCurrency) {
        query = query.eq('to_currency', toCurrency);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ExchangeRate[];
    },
  });
}

// ============================================================================
// FINANCIAL STATEMENTS HOOKS
// ============================================================================

export interface FinancialStatement {
  id: string;
  statement_type: 'balance_sheet' | 'income_statement' | 'cash_flow' | 'trial_balance';
  fiscal_period_id: string;
  statement_date: string;
  statement_data: any;
  total_assets?: number;
  total_liabilities?: number;
  total_equity?: number;
  total_revenue?: number;
  total_expenses?: number;
  net_profit?: number;
  is_final: boolean;
}

export function useFinancialStatements(statementType?: string, fiscalPeriodId?: string) {
  return useQuery({
    queryKey: ['financial-statements', statementType, fiscalPeriodId],
    queryFn: async () => {
      let query = supabase
        .from('financial_statements')
        .select('*, fiscal_period:fiscal_periods(period_name)')
        .order('statement_date', { ascending: false });

      if (statementType) {
        query = query.eq('statement_type', statementType);
      }
      if (fiscalPeriodId) {
        query = query.eq('fiscal_period_id', fiscalPeriodId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// ============================================================================
// WRITE-OFFS HOOKS
// ============================================================================

export interface WriteOff {
  id: string;
  write_off_type: 'bad_debt' | 'inventory' | 'asset' | 'other';
  customer_id?: string;
  invoice_id?: string;
  write_off_date: string;
  write_off_amount: number;
  reason: string;
  approval_level: string;
  status: 'pending' | 'approved' | 'rejected' | 'posted';
}

export function useWriteOffs(status?: string) {
  return useQuery({
    queryKey: ['write-offs', status],
    queryFn: async () => {
      let query = supabase
        .from('write_offs')
        .select('*, customer:customers(company_name)')
        .order('write_off_date', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateWriteOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (writeOff: Omit<WriteOff, 'id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('write_offs')
        .insert([{ ...writeOff, created_by: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['write-offs'] });
      toast.success('Write-off created');
    },
    onError: (error: any) => {
      toast.error('Failed to create write-off: ' + error.message);
    },
  });
}
