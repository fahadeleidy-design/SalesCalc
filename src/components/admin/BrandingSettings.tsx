import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, Save, Image as ImageIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface CompanyInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  logo_url: string;
}

interface TermsSettings {
  default_terms: string;
}

export default function BrandingSettings() {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    logo_url: ''
  });
  const [terms, setTerms] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);

      const { data: companyData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'company_info')
        .single();

      const { data: termsData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'terms_and_conditions')
        .single();

      if (companyData?.value) {
        setCompanyInfo(companyData.value as CompanyInfo);
        if ((companyData.value as CompanyInfo).logo_url) {
          setLogoPreview((companyData.value as CompanyInfo).logo_url);
        }
      }

      if (termsData?.value) {
        setTerms((termsData.value as TermsSettings).default_terms || '');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);

      setLogoPreview(publicUrl);
      setCompanyInfo(prev => ({ ...prev, logo_url: publicUrl }));

      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveCompanyInfo = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('system_settings')
        .update({
          value: companyInfo,
          updated_at: new Date().toISOString()
        })
        .eq('key', 'company_info');

      if (error) throw error;

      toast.success('Company information saved successfully');
    } catch (error) {
      console.error('Error saving company info:', error);
      toast.error('Failed to save company information');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTerms = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('system_settings')
        .update({
          value: { default_terms: terms },
          updated_at: new Date().toISOString()
        })
        .eq('key', 'terms_and_conditions');

      if (error) throw error;

      toast.success('Terms & Conditions saved successfully');
    } catch (error) {
      console.error('Error saving terms:', error);
      toast.error('Failed to save Terms & Conditions');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Company Branding</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage your company logo and information displayed on quotations
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Logo
            </label>
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                {logoPreview ? (
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Company Logo"
                      className="w-32 h-32 object-contain border-2 border-gray-200 rounded-lg bg-white p-2"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label
                  htmlFor="logo-upload"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload Logo'}
                </label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <p className="text-xs text-gray-500 mt-2">
                  PNG, JPG or SVG. Max 2MB. Recommended: 200x200px
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              <input
                type="text"
                value={companyInfo.name}
                onChange={(e) => setCompanyInfo(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your Company Name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={companyInfo.email}
                onChange={(e) => setCompanyInfo(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="contact@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={companyInfo.phone}
                onChange={(e) => setCompanyInfo(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website
              </label>
              <input
                type="url"
                value={companyInfo.website}
                onChange={(e) => setCompanyInfo(prev => ({ ...prev, website: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://company.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <textarea
              value={companyInfo.address}
              onChange={(e) => setCompanyInfo(prev => ({ ...prev, address: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Company address"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              onClick={handleSaveCompanyInfo}
              disabled={saving}
              className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Company Info'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Default Terms & Conditions</h2>
          <p className="text-sm text-gray-600 mt-1">
            Set the default terms and conditions that appear on all new quotations
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium">These terms will be used by default</p>
              <p className="mt-1">
                Sales reps can customize terms for individual quotations. These defaults will
                be pre-filled when creating new quotations.
              </p>
            </div>
          </div>

          <div>
            <textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={12}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="Enter your default terms and conditions..."
            />
            <p className="text-xs text-gray-500 mt-2">
              Use clear, numbered points. Include payment terms, delivery conditions, warranty
              information, and liability clauses.
            </p>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              onClick={handleSaveTerms}
              disabled={saving}
              className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Terms & Conditions'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-green-900">
          <p className="font-medium">Changes saved successfully</p>
          <p className="mt-1">
            Your branding and terms will be applied to all new quotations. Existing quotations
            will retain their original settings.
          </p>
        </div>
      </div>
    </div>
  );
}
