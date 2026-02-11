import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export interface QualityCost {
  id: string;
  cost_type: string;
  category: string;
  description: string;
  amount: number;
  reference_type: string | null;
  reference_id: string | null;
  cost_date: string;
  recorded_by: string | null;
  created_at: string;
  recorder?: { full_name: string } | null;
}

export interface QualityAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface SamplingPlan {
  id: string;
  name: string;
  description: string | null;
  inspection_level: string;
  aql_level: number;
  lot_size_min: number;
  lot_size_max: number;
  sample_size: number;
  accept_number: number;
  reject_number: number;
  is_active: boolean;
  created_at: string;
}

export interface QualityAuditEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
  changer?: { full_name: string } | null;
}

export function useQualityCosts(dateRange?: { from: string; to: string }) {
  const { profile } = useAuth();
  const [costs, setCosts] = useState<QualityCost[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCosts = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('quality_costs')
      .select('*, recorder:profiles!quality_costs_recorded_by_fkey(full_name)')
      .order('cost_date', { ascending: false });

    if (dateRange?.from) query = query.gte('cost_date', dateRange.from);
    if (dateRange?.to) query = query.lte('cost_date', dateRange.to);

    const { data } = await query;
    setCosts((data || []) as QualityCost[]);
    setLoading(false);
  }, [dateRange?.from, dateRange?.to]);

  useEffect(() => { loadCosts(); }, [loadCosts]);

  const createCost = async (cost: Omit<QualityCost, 'id' | 'created_at' | 'recorded_by' | 'recorder'>) => {
    const { error } = await supabase.from('quality_costs').insert({
      ...cost,
      recorded_by: profile?.id,
    });
    if (error) { toast.error('Failed to record quality cost'); return false; }
    toast.success('Quality cost recorded');
    loadCosts();
    return true;
  };

  const summary = {
    prevention: costs.filter(c => c.cost_type === 'prevention').reduce((s, c) => s + Number(c.amount), 0),
    appraisal: costs.filter(c => c.cost_type === 'appraisal').reduce((s, c) => s + Number(c.amount), 0),
    internalFailure: costs.filter(c => c.cost_type === 'internal_failure').reduce((s, c) => s + Number(c.amount), 0),
    externalFailure: costs.filter(c => c.cost_type === 'external_failure').reduce((s, c) => s + Number(c.amount), 0),
    total: costs.reduce((s, c) => s + Number(c.amount), 0),
  };

  return { costs, loading, createCost, summary, refresh: loadCosts };
}

export function useQualityAlerts() {
  const [alerts, setAlerts] = useState<QualityAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('quality_alerts')
      .select('*')
      .order('created_at', { ascending: false });
    setAlerts((data || []) as QualityAlert[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  const resolveAlert = async (alertId: string) => {
    const { error } = await supabase.from('quality_alerts')
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', alertId);
    if (error) { toast.error('Failed to resolve alert'); return; }
    toast.success('Alert resolved');
    loadAlerts();
  };

  const markRead = async (alertId: string) => {
    await supabase.from('quality_alerts').update({ is_read: true }).eq('id', alertId);
    loadAlerts();
  };

  const unresolved = alerts.filter(a => !a.is_resolved);
  const critical = unresolved.filter(a => a.severity === 'critical');

  return { alerts, loading, resolveAlert, markRead, unresolved, critical, refresh: loadAlerts };
}

export function useSamplingPlans() {
  const { profile } = useAuth();
  const [plans, setPlans] = useState<SamplingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('sampling_plans')
      .select('*')
      .order('lot_size_min');
    setPlans((data || []) as SamplingPlan[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const createPlan = async (plan: Omit<SamplingPlan, 'id' | 'created_at' | 'is_active'>) => {
    const { error } = await supabase.from('sampling_plans').insert({
      ...plan,
      created_by: profile?.id,
    });
    if (error) { toast.error('Failed to create sampling plan'); return false; }
    toast.success('Sampling plan created');
    loadPlans();
    return true;
  };

  const updatePlan = async (id: string, updates: Partial<SamplingPlan>) => {
    const { error } = await supabase.from('sampling_plans').update(updates).eq('id', id);
    if (error) { toast.error('Failed to update'); return false; }
    toast.success('Updated');
    loadPlans();
    return true;
  };

  const toggleActive = async (plan: SamplingPlan) => {
    return updatePlan(plan.id, { is_active: !plan.is_active });
  };

  const getSuggestedPlan = (lotSize: number, level: string = 'normal') => {
    return plans.find(p =>
      p.is_active &&
      p.inspection_level === level &&
      lotSize >= p.lot_size_min &&
      lotSize <= p.lot_size_max
    );
  };

  return { plans, loading, createPlan, updatePlan, toggleActive, getSuggestedPlan, refresh: loadPlans };
}

export function useQualityAuditLog(entityType?: string, entityId?: string) {
  const [entries, setEntries] = useState<QualityAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('quality_audit_log')
      .select('*, changer:profiles!quality_audit_log_changed_by_fkey(full_name)')
      .order('changed_at', { ascending: false })
      .limit(100);

    if (entityType) query = query.eq('entity_type', entityType);
    if (entityId) query = query.eq('entity_id', entityId);

    const { data } = await query;
    setEntries((data || []) as QualityAuditEntry[]);
    setLoading(false);
  }, [entityType, entityId]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const logEntry = async (entry: { entity_type: string; entity_id: string; action: string; old_value?: string; new_value?: string }) => {
    await supabase.from('quality_audit_log').insert({
      ...entry,
      changed_by: (await supabase.auth.getUser()).data.user?.id,
    });
  };

  return { entries, loading, logEntry, refresh: loadEntries };
}
