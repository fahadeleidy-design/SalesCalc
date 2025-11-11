import { useState, useEffect } from 'react';
import { Edit2, Save, X, Plus, Trash2, Upload, Building2, FileText, Palette, Languages, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrencyCompact } from '../lib/currencyUtils';
import BrandingSettings from '../components/admin/BrandingSettings';
import { useLanguage } from '../contexts/LanguageContext';
import toast from 'react-hot-toast';

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
  const { t, language, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<'branding' | 'discount' | 'commission' | 'language' | 'security'>('branding');
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

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        if (error.message.includes('New password should be different')) {
          toast.error('New password must be different from the current password');
        } else {
          toast.error(error.message || 'Failed to update password');
        }
        return;
      }

      toast.success('Password updated successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setChangingPassword(false);
    }
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="flex gap-2 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('branding')}
              className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'branding'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Palette className="w-4 h-4" />
              Branding & Terms
            </button>
            <button
              onClick={() => setActiveTab('discount')}
              className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'discount'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              Discount Matrix
            </button>
            <button
              onClick={() => setActiveTab('commission')}
              className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'commission'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Commission Tiers
            </button>
            <button
              onClick={() => setActiveTab('language')}
              className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'language'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Languages className="w-4 h-4" />
              {t.settings.language}
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'security'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Lock className="w-4 h-4" />
              Security
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'branding' && <BrandingSettings />}

          {activeTab === 'language' && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Languages className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-slate-900">{t.settings.selectLanguage}</h3>
              </div>
              <div className="space-y-4 max-w-md">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setLanguage('en')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      language === 'en'
                        ? 'border-orange-500 bg-orange-50 text-orange-600'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="text-2xl mb-2">🇬🇧</div>
                    <div className="font-medium">{t.settings.english}</div>
                    <div className="text-xs text-slate-500 mt-1">English</div>
                  </button>
                  <button
                    onClick={() => setLanguage('ar')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      language === 'ar'
                        ? 'border-orange-500 bg-orange-50 text-orange-600'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="text-2xl mb-2">🇸🇦</div>
                    <div className="font-medium">{t.settings.arabic}</div>
                    <div className="text-xs text-slate-500 mt-1">العربية</div>
                  </button>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    {language === 'en'
                      ? 'Your language preference is saved automatically and will be remembered across sessions.'
                      : 'يتم حفظ تفضيل اللغة الخاص بك تلقائيًا وسيتم تذكره عبر الجلسات.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Lock className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-slate-900">Change Password</h3>
              </div>
              <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Enter new password"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Confirm new password"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    {language === 'en'
                      ? 'Password must be at least 6 characters long. You will remain logged in after changing your password.'
                      : 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل. ستبقى مسجلاً للدخول بعد تغيير كلمة المرور.'}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {changingPassword ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      {language === 'en' ? 'Updating...' : 'جاري التحديث...'}
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      {language === 'en' ? 'Update Password' : 'تحديث كلمة المرور'}
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'discount' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  <h3 className="font-semibold text-slate-900">Discount Matrix</h3>
                </div>
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
          )}

          {activeTab === 'commission' && (
            <div>
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
          )}
        </div>
      </div>
    </div>
  );
}
