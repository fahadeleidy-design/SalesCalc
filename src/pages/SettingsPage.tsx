import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Edit2, Save, X, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DiscountRule {
  id: string;
  min_quotation_value: number;
  max_quotation_value: number | null;
  max_discount_percentage: number;
  requires_ceo_approval: boolean;
}

interface CommissionTier {
  id: string;
  tier_name: string;
  min_amount: number;
  max_amount: number | null;
  commission_percentage: number;
  is_active: boolean;
}

export default function SettingsPage() {
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>([]);
  const [commissionTiers, setCommissionTiers] = useState<CommissionTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<string | null>(null);
  const [showCommissionForm, setShowCommissionForm] = useState(false);
  const [newCommission, setNewCommission] = useState({
    tier_name: '',
    min_amount: 0,
    max_amount: null as number | null,
    commission_percentage: 0,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [discountResult, commissionResult] = await Promise.all([
        supabase.from('discount_matrix').select('*').order('min_quotation_value'),
        supabase
          .from('commission_plans')
          .select('*')
          .is('sales_rep_id', null)
          .order('min_amount'),
      ]);

      if (discountResult.data) setDiscountRules(discountResult.data);
      if (commissionResult.data) setCommissionTiers(commissionResult.data);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateDiscountRule = async (rule: DiscountRule) => {
    try {
      const { error } = await supabase
        .from('discount_matrix')
      // @ts-expect-error - Supabase type inference issue
        .update({
          min_quotation_value: rule.min_quotation_value,
          max_quotation_value: rule.max_quotation_value,
          max_discount_percentage: rule.max_discount_percentage,
          requires_ceo_approval: rule.requires_ceo_approval,
          updated_at: new Date().toISOString(),
        })
        .eq('id', rule.id);

      if (error) throw error;
      setEditingDiscount(null);
      alert('Discount rule updated successfully!');
    } catch (error: any) {
      console.error('Error updating discount rule:', error);
      alert('Failed to update discount rule: ' + error.message);
    }
  };

  const addCommissionTier = async () => {
    if (!newCommission.tier_name || newCommission.commission_percentage <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      // @ts-expect-error - Supabase type inference issue
      const { error } = await supabase.from('commission_plans').insert({
        tier_name: newCommission.tier_name,
        min_amount: newCommission.min_amount,
        max_amount: newCommission.max_amount,
        commission_percentage: newCommission.commission_percentage,
        is_active: true,
        sales_rep_id: null,
      });

      if (error) throw error;

      setNewCommission({
        tier_name: '',
        min_amount: 0,
        max_amount: null,
        commission_percentage: 0,
      });
      setShowCommissionForm(false);
      loadSettings();
      alert('Commission tier added successfully!');
    } catch (error: any) {
      console.error('Error adding commission tier:', error);
      alert('Failed to add commission tier: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteCommissionTier = async (id: string) => {
    if (!confirm('Are you sure you want to delete this commission tier?')) return;

    try {
      const { error } = await supabase.from('commission_plans').delete().eq('id', id);

      if (error) throw error;
      loadSettings();
      alert('Commission tier deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting commission tier:', error);
      alert('Failed to delete commission tier: ' + error.message);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '∞';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1">Configure system parameters and preferences</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Discount Approval Matrix</h3>
          <p className="text-sm text-slate-600">Click values to edit</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                  Quotation Value Range
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                  Max Discount %
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                  Requires CEO Approval
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {discountRules.map((rule, index) => (
                <tr key={rule.id} className="border-b border-slate-100">
                  <td className="py-3 px-4 text-sm text-slate-900">
                    {formatCurrency(rule.min_quotation_value)} -{' '}
                    {formatCurrency(rule.max_quotation_value)}
                  </td>
                  <td className="py-3 px-4">
                    {editingDiscount === rule.id ? (
                      <input
                        type="number"
                        value={rule.max_discount_percentage}
                        onChange={(e) => {
                          const updated = [...discountRules];
                          updated[index].max_discount_percentage = parseFloat(e.target.value);
                          setDiscountRules(updated);
                        }}
                        className="w-24 px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                    ) : (
                      <span className="text-sm text-slate-900">
                        {rule.max_discount_percentage}%
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingDiscount === rule.id ? (
                      <select
                        value={rule.requires_ceo_approval ? 'yes' : 'no'}
                        onChange={(e) => {
                          const updated = [...discountRules];
                          updated[index].requires_ceo_approval = e.target.value === 'yes';
                          setDiscountRules(updated);
                        }}
                        className="px-2 py-1 border border-slate-300 rounded text-sm"
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    ) : (
                      <span className="text-sm text-slate-900">
                        {rule.requires_ceo_approval ? 'Yes' : 'No'}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editingDiscount === rule.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateDiscountRule(rule)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Save"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingDiscount(null);
                            loadSettings();
                          }}
                          className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingDiscount(rule.id)}
                        className="p-1 text-coral-600 hover:bg-coral-50 rounded"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900">Commission Tiers</h3>
            <p className="text-sm text-slate-600 mt-1">
              Configure commission rates based on deal value
            </p>
          </div>
          {!showCommissionForm && (
            <button
              onClick={() => setShowCommissionForm(true)}
              className="flex items-center gap-2 bg-coral-600 hover:bg-coral-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Tier
            </button>
          )}
        </div>

        {showCommissionForm && (
          <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="font-medium text-slate-900 mb-3">Add New Commission Tier</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tier Name
                </label>
                <input
                  type="text"
                  value={newCommission.tier_name}
                  onChange={(e) =>
                    setNewCommission({ ...newCommission, tier_name: e.target.value })
                  }
                  placeholder="e.g., Premium Tier"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Commission %
                </label>
                <input
                  type="number"
                  value={newCommission.commission_percentage}
                  onChange={(e) =>
                    setNewCommission({
                      ...newCommission,
                      commission_percentage: parseFloat(e.target.value),
                    })
                  }
                  placeholder="0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Min Deal Value ($)
                </label>
                <input
                  type="number"
                  value={newCommission.min_amount}
                  onChange={(e) =>
                    setNewCommission({
                      ...newCommission,
                      min_amount: parseFloat(e.target.value),
                    })
                  }
                  placeholder="0"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Max Deal Value ($) - Leave empty for unlimited
                </label>
                <input
                  type="number"
                  value={newCommission.max_amount || ''}
                  onChange={(e) =>
                    setNewCommission({
                      ...newCommission,
                      max_amount: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="Unlimited"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={addCommissionTier}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Tier'}
              </button>
              <button
                onClick={() => {
                  setShowCommissionForm(false);
                  setNewCommission({
                    tier_name: '',
                    min_amount: 0,
                    max_amount: null,
                    commission_percentage: 0,
                  });
                }}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {commissionTiers.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>No commission tiers configured yet.</p>
            <p className="text-sm mt-1">Add your first tier to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                    Tier Name
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                    Deal Value Range
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                    Commission %
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {commissionTiers.map((tier) => (
                  <tr key={tier.id} className="border-b border-slate-100">
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">
                      {tier.tier_name}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-900">
                      {formatCurrency(tier.min_amount)} - {formatCurrency(tier.max_amount)}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-900">
                      {tier.commission_percentage}%
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          tier.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {tier.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => deleteCommissionTier(tier.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
