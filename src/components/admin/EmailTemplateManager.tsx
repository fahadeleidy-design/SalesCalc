import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Plus, Edit2, Trash2, Eye, Save, X, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string | null;
  template_type: string;
  variables: Record<string, string> | null;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface EmailTemplateManagerProps {
  onTemplatesChange?: () => void;
}

export const EmailTemplateManager: React.FC<EmailTemplateManagerProps> = ({
  onTemplatesChange,
}) => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState<Partial<EmailTemplate>>({
    name: '',
    subject: '',
    body_html: '',
    body_text: '',
    template_type: 'notification',
    description: '',
    is_active: true,
    variables: {},
  });

  const templateTypes = [
    'notification',
    'quotation_approval',
    'quotation_rejected',
    'quotation_won',
    'quotation_lost',
    'payment_reminder',
    'welcome',
    'password_reset',
    'invoice',
    'order_confirmation',
    'shipping_update',
    'custom',
  ];

  const availableVariables = [
    { key: '{{user_name}}', description: 'Recipient name' },
    { key: '{{company_name}}', description: 'Company name' },
    { key: '{{quotation_number}}', description: 'Quotation number' },
    { key: '{{customer_name}}', description: 'Customer name' },
    { key: '{{amount}}', description: 'Amount/Total' },
    { key: '{{date}}', description: 'Current date' },
    { key: '{{link}}', description: 'Action link' },
    { key: '{{status}}', description: 'Status text' },
    { key: '{{notes}}', description: 'Additional notes' },
  ];

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingTemplate(null);
    setFormData({
      name: '',
      subject: '',
      body_html: getDefaultTemplate(),
      body_text: '',
      template_type: 'notification',
      description: '',
      is_active: true,
      variables: {},
    });
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setIsCreating(false);
    setFormData({
      name: template.name,
      subject: template.subject,
      body_html: template.body_html,
      body_text: template.body_text || '',
      template_type: template.template_type,
      description: template.description || '',
      is_active: template.is_active,
      variables: template.variables || {},
    });
  };

  const handleDuplicate = (template: EmailTemplate) => {
    setIsCreating(true);
    setEditingTemplate(null);
    setFormData({
      name: `${template.name} (Copy)`,
      subject: template.subject,
      body_html: template.body_html,
      body_text: template.body_text || '',
      template_type: template.template_type,
      description: template.description || '',
      is_active: false,
      variables: template.variables || {},
    });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.subject || !formData.body_html) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('email_templates')
          .update({
            name: formData.name,
            subject: formData.subject,
            body_html: formData.body_html,
            body_text: formData.body_text || null,
            template_type: formData.template_type,
            description: formData.description || null,
            is_active: formData.is_active,
            variables: formData.variables,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast.success('Template updated successfully');
      } else {
        const { error } = await supabase
          .from('email_templates')
          .insert({
            name: formData.name,
            subject: formData.subject,
            body_html: formData.body_html,
            body_text: formData.body_text || null,
            template_type: formData.template_type,
            description: formData.description || null,
            is_active: formData.is_active,
            variables: formData.variables,
          });

        if (error) throw error;
        toast.success('Template created successfully');
      }

      await loadTemplates();
      handleCancel();
      onTemplatesChange?.();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadTemplates();
      toast.success('Template deleted successfully');
      onTemplatesChange?.();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setTemplates(templates.map(t =>
        t.id === id ? { ...t, is_active: !currentStatus } : t
      ));

      toast.success(`Template ${!currentStatus ? 'activated' : 'deactivated'}`);
      onTemplatesChange?.();
    } catch (error) {
      console.error('Error toggling template:', error);
      toast.error('Failed to update template');
    }
  };

  const handleCancel = () => {
    setEditingTemplate(null);
    setIsCreating(false);
    setFormData({
      name: '',
      subject: '',
      body_html: '',
      body_text: '',
      template_type: 'notification',
      description: '',
      is_active: true,
      variables: {},
    });
  };

  const insertVariable = (variable: string) => {
    setFormData({
      ...formData,
      body_html: (formData.body_html || '') + variable,
    });
  };

  const getDefaultTemplate = () => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(to right, #3b82f6, #14b8a6); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Special Offices ERP</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0;">Hello {{user_name}},</h2>

              <p style="color: #4b5563; line-height: 1.6; margin: 0 0 15px 0;">
                Your content goes here. You can use variables like {{customer_name}}, {{quotation_number}}, and {{amount}}.
              </p>

              <p style="color: #4b5563; line-height: 1.6; margin: 0 0 15px 0;">
                Additional information or call to action can be placed here.
              </p>

              <!-- Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{link}}" style="background-color: #3b82f6; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                  View Details
                </a>
              </div>

              <p style="color: #4b5563; line-height: 1.6; margin: 15px 0 0 0;">
                Best regards,<br>
                <strong>Special Offices ERP Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                This is an automated message from Special Offices ERP
              </p>
              <p style="color: #6b7280; font-size: 12px; margin: 5px 0 0 0;">
                &copy; 2024 Special Offices. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-gray-600">Loading templates...</p>
      </Card>
    );
  }

  if (isCreating || editingTemplate) {
    return (
      <Card>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </h2>
            <Button variant="secondary" size="sm" onClick={handleCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Payment Reminder"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Type *
              </label>
              <select
                value={formData.template_type}
                onChange={(e) => setFormData({ ...formData, template_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {templateTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject Line *
            </label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="e.g., Your payment is due"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <Input
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this template"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                HTML Body *
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Available Variables:</span>
                <div className="flex flex-wrap gap-1">
                  {availableVariables.slice(0, 5).map((v) => (
                    <button
                      key={v.key}
                      onClick={() => insertVariable(v.key)}
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                      title={v.description}
                    >
                      {v.key}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <textarea
              value={formData.body_html}
              onChange={(e) => setFormData({ ...formData, body_html: e.target.value })}
              rows={15}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="Enter HTML template..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plain Text Body (Optional)
            </label>
            <textarea
              value={formData.body_text || ''}
              onChange={(e) => setFormData({ ...formData, body_text: e.target.value })}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Plain text version for email clients that don't support HTML"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Active (template can be used immediately)
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const preview = {
                  ...formData,
                  id: 'preview',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                } as EmailTemplate;
                setPreviewTemplate(preview);
              }}
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Email Templates</h3>
          <p className="text-sm text-gray-600">Manage and customize email templates</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      <div className="grid gap-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        template.is_active ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                    <h4 className="font-semibold text-gray-900">{template.name}</h4>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {template.template_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Subject:</strong> {template.subject}
                  </p>
                  {template.description && (
                    <p className="text-sm text-gray-500">{template.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    Last updated: {new Date(template.updated_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPreviewTemplate(template)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDuplicate(template)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleToggleActive(template.id, template.is_active)}
                    className={template.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-50'}
                  >
                    {template.is_active ? 'Active' : 'Inactive'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {templates.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No templates found. Create your first template to get started.</p>
          </Card>
        )}
      </div>

      {previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">Template Preview</h3>
              <Button variant="secondary" size="sm" onClick={() => setPreviewTemplate(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6">
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">
                  <strong>Subject:</strong> {previewTemplate.subject}
                </p>
              </div>
              <div
                className="border border-gray-200 rounded-lg p-4 bg-white"
                dangerouslySetInnerHTML={{ __html: previewTemplate.body_html }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
