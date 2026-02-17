import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Save, Send, AlertCircle, CheckCircle, Mail, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

interface EmailConfig {
  id: string;
  tenant_id: string | null;
  client_id: string | null;
  client_secret: string | null;
  from_email: string;
  from_name: string;
  smtp_host: string;
  smtp_port: number;
  use_oauth: boolean;
  is_active: boolean;
  test_mode: boolean;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  template_type: string;
  is_active: boolean;
  description: string | null;
}

export const EmailConfigPage: React.FC = () => {
  const { profile } = useAuth();
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    if (profile?.role === 'admin') {
      loadEmailConfig();
      loadTemplates();
    }
  }, [profile]);

  const loadEmailConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('email_config')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig(data);
      } else {
        // Create default config
        setConfig({
          id: '',
          tenant_id: null,
          client_id: null,
          client_secret: null,
          from_email: '',
          from_name: 'SalesCalc System',
          smtp_host: 'smtp.office365.com',
          smtp_port: 587,
          use_oauth: true,
          is_active: true,
          test_mode: true,
        });
      }
    } catch (error) {
      console.error('Error loading email config:', error);
      toast.error('Failed to load email configuration');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('template_type');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;

    setSaving(true);
    try {
      if (config.id) {
        const { error } = await supabase
          .from('email_config')
          .update({
            tenant_id: config.tenant_id,
            client_id: config.client_id,
            client_secret: config.client_secret,
            from_email: config.from_email,
            from_name: config.from_name,
            smtp_host: config.smtp_host,
            smtp_port: config.smtp_port,
            use_oauth: config.use_oauth,
            test_mode: config.test_mode,
          })
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('email_config')
          .insert({
            tenant_id: config.tenant_id,
            client_id: config.client_id,
            client_secret: config.client_secret,
            from_email: config.from_email,
            from_name: config.from_name,
            smtp_host: config.smtp_host,
            smtp_port: config.smtp_port,
            use_oauth: config.use_oauth,
            test_mode: config.test_mode,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) setConfig(data);
      }

      toast.success('Email configuration saved successfully');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save email configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }

    setSendingTest(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification-email`;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: testEmail,
          subject: 'Test Email from SalesCalc',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(to right, #3b82f6, #14b8a6); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1>Test Email</h1>
              </div>
              <div style="background: white; padding: 30px; border: 1px solid #e2e8f0;">
                <p>This is a test email from SalesCalc email system.</p>
                <p>If you received this email, your Office365 email configuration is working correctly!</p>
              </div>
              <div style="background: #f1f5f9; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #64748b;">
                <p>SalesCalc - Email Test</p>
              </div>
            </div>
          `,
          type: 'notification',
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.test_mode
          ? 'Test email logged (test mode enabled - not actually sent)'
          : 'Test email sent successfully!');
      } else {
        toast.error(result.message || 'Failed to send test email');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error('Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  };

  const toggleTemplate = async (templateId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ is_active: !currentStatus })
        .eq('id', templateId);

      if (error) throw error;

      setTemplates(templates.map(t =>
        t.id === templateId ? { ...t, is_active: !currentStatus } : t
      ));

      toast.success(`Template ${!currentStatus ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling template:', error);
      toast.error('Failed to update template');
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="p-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="w-6 h-6" />
            <p>You do not have permission to access this page.</p>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <p>Loading email configuration...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Configuration</h1>
          <p className="text-gray-600 mt-1">Configure Office365 email settings and manage templates</p>
        </div>
      </div>

      {/* Office365 Configuration */}
      <Card>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Office365 Settings</h2>
              <p className="text-sm text-gray-600">Configure Microsoft 365 / Office365 email integration</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Setup Instructions:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Register an app in Azure Portal (Azure Active Directory)</li>
              <li>Add Mail.Send application permission</li>
              <li>Grant admin consent for the permission</li>
              <li>Create a client secret</li>
              <li>Enter the credentials below</li>
            </ol>
          </div>

          {config && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Email Address *
                  </label>
                  <Input
                    type="email"
                    value={config.from_email}
                    onChange={(e) => setConfig({ ...config, from_email: e.target.value })}
                    placeholder="noreply@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Name *
                  </label>
                  <Input
                    value={config.from_name}
                    onChange={(e) => setConfig({ ...config, from_name: e.target.value })}
                    placeholder="SalesCalc System"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tenant ID (Directory ID)
                  </label>
                  <Input
                    value={config.tenant_id || ''}
                    onChange={(e) => setConfig({ ...config, tenant_id: e.target.value })}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client ID (Application ID)
                  </label>
                  <Input
                    value={config.client_id || ''}
                    onChange={(e) => setConfig({ ...config, client_id: e.target.value })}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Secret
                  </label>
                  <Input
                    type="password"
                    value={config.client_secret || ''}
                    onChange={(e) => setConfig({ ...config, client_secret: e.target.value })}
                    placeholder="Enter client secret"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.use_oauth}
                    onChange={(e) => setConfig({ ...config, use_oauth: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Use OAuth2 (Recommended)</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.test_mode}
                    onChange={(e) => setConfig({ ...config, test_mode: e.target.checked })}
                    className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm text-gray-700">Test Mode (Log only, don't send)</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleSaveConfig} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Test Email */}
      <Card>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Test Email</h2>
              <p className="text-sm text-gray-600">Send a test email to verify configuration</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            <Button onClick={handleSendTestEmail} disabled={sendingTest}>
              <Send className="w-4 h-4 mr-2" />
              {sendingTest ? 'Sending...' : 'Send Test Email'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Email Templates */}
      <Card>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-purple-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Email Templates</h2>
              <p className="text-sm text-gray-600">Manage email notification templates</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${template.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div>
                      <h3 className="font-medium text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-600">{template.description || template.subject}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    {template.template_type}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => toggleTemplate(template.id, template.is_active)}
                  >
                    {template.is_active ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Email Logs Link */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Email Logs</h3>
              <p className="text-sm text-gray-600">View all sent email notifications and their status</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => window.location.href = '/email-logs'}
            >
              View Logs
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
