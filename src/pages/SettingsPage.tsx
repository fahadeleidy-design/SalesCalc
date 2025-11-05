import { useState, useEffect } from 'react';
import { Edit2, Save, X, Plus, Trash2, Upload, Building2, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrencyCompact } from '../lib/currencyUtils';

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

interface SystemSettings {
  id: string;
  company_name: string;
  company_logo_url: string | null;
  default_terms_and_conditions: string;
}

export default function SettingsPage() {
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>([]);
  const [commissionTiers, setCommissionTiers] = useState<CommissionTier[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<string | null>(null);
  const [showCommissionForm, setShowCommissionForm] = useState(false);
  const [editingBranding, setEditingBranding] = useState(false);
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
      const [discountResult, commissionResult, settingsResult] = await Promise.all([
        supabase.from('discount_matrix').select('*').order('min_quotation_value'),
        supabase
          .from('commission_plans')
          .select('*')
          .is('sales_rep_id', null)
          .order('min_amount'),
        supabase.from('system_settings').select('*').single(),
      ]);

      if (discountResult.data) setDiscountRules(discountResult.data);
      if (commissionResult.data) setCommissionTiers(commissionResult.data);
      if (settingsResult.data) setSystemSettings(settingsResult.data);
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

  const updateSystemSettings = async () => {
    if (!systemSettings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({
          company_name: systemSettings.company_name,
          company_logo_url: systemSettings.company_logo_url,
          default_terms_and_conditions: systemSettings.default_terms_and_conditions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', systemSettings.id);

      if (error) throw error;
      setEditingBranding(false);
      alert('Settings updated successfully!');
    } catch (error: any) {
      console.error('Error updating settings:', error);
      alert('Failed to update settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrencyValue = (value: number | null) => {
    if (value === null) return '∞';
    return formatCurrencyCompact(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
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
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-slate-900">Company Branding & Terms</h3>
          </div>
          {!editingBranding ? (
            <button
              onClick={() => setEditingBranding(true)}
              className="flex items-center gap-2 text-orange-500 hover:bg-orange-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={updateSystemSettings}
                disabled={saving}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setEditingBranding(false);
                  loadSettings();
                }}
                className="flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Company Name
            </label>
            {editingBranding ? (
              <input
                type="text"
                value={systemSettings?.company_name || ''}
                onChange={(e) =>
                  setSystemSettings(
                    systemSettings ? { ...systemSettings, company_name: e.target.value } : null
                  )
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="Your Company Name"
              />
            ) : (
              <p className="text-slate-900">{systemSettings?.company_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Company Logo URL
            </label>
            {editingBranding ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={systemSettings?.company_logo_url || ''}
                  onChange={(e) =>
                    setSystemSettings(
                      systemSettings
                        ? { ...systemSettings, company_logo_url: e.target.value }
                        : null
                    )
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-slate-500">
                  Enter a public URL to your company logo (recommended size: 200x80px)
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {systemSettings?.company_logo_url ? (
                  <img
                    src={systemSettings.company_logo_url}
                    alt="Company Logo"
                    className="h-12 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <p className="text-slate-500 text-sm">No logo set</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <FileText className="w-4 h-4" />
              Default Terms & Conditions
            </label>
            {editingBranding ? (
              <textarea
                value={systemSettings?.default_terms_and_conditions || ''}
                onChange={(e) =>
                  setSystemSettings(
                    systemSettings
                      ? { ...systemSettings, default_terms_and_conditions: e.target.value }
                      : null
                  )
                }
                rows={10}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                placeholder="Enter default terms and conditions..."
              />
            ) : (
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">
                  {systemSettings?.default_terms_and_conditions}
                </pre>
              </div>
            )}
          </div>
        </div>
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
                    {formatCurrencyValue(rule.min_quotation_value)} -{' '}
                    {formatCurrencyValue(rule.max_quotation_value)}
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
                        className="p-1 text-orange-500 hover:bg-orange-50 rounded"
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
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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
                  Min Deal Value (SAR)
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
                  Max Deal Value (SAR) - Leave empty for unlimited
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
                      {formatCurrencyValue(tier.min_amount)} - {formatCurrencyValue(tier.max_amount)}
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
