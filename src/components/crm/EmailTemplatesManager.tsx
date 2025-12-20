import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Plus, Edit2, Trash2, Copy, Search, Tag, Clock, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  tags: string[];
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export default function EmailTemplatesManager() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    category: 'outbound',
    tags: [] as string[],
    is_active: true,
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['email-templates', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_email_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EmailTemplate[];
    },
    enabled: !!profile?.id,
  });

  const createTemplate = useMutation({
    mutationFn: async (templateData: typeof formData) => {
      const { data, error } = await supabase
        .from('crm_email_templates')
        .insert([{
          ...templateData,
          created_by: profile?.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Email template created successfully');
      resetForm();
    },
    onError: () => {
      toast.error('Failed to create email template');
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const { error } = await supabase
        .from('crm_email_templates')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template updated successfully');
      resetForm();
    },
    onError: () => {
      toast.error('Failed to update template');
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('crm_email_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete template');
    },
  });

  const duplicateTemplate = useMutation({
    mutationFn: async (template: EmailTemplate) => {
      const { data, error } = await supabase
        .from('crm_email_templates')
        .insert([{
          name: `${template.name} (Copy)`,
          subject: template.subject,
          body: template.body,
          category: template.category,
          tags: template.tags,
          is_active: template.is_active,
          created_by: profile?.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template duplicated successfully');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingTemplate) {
      updateTemplate.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createTemplate.mutate(formData);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      subject: '',
      body: '',
      category: 'outbound',
      tags: [],
      is_active: true,
    });
    setEditingTemplate(null);
    setIsModalOpen(false);
  };

  const openEditModal = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body,
      category: template.category,
      tags: template.tags || [],
      is_active: template.is_active,
    });
    setIsModalOpen(true);
  };

  const categories = ['all', 'outbound', 'nurture', 'follow_up', 'meeting', 'proposal', 'closing'];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const variablesHelp = [
    '{{first_name}} - Contact first name',
    '{{last_name}} - Contact last name',
    '{{company_name}} - Company name',
    '{{position}} - Contact position',
    '{{sales_rep_name}} - Your name',
    '{{sales_rep_email}} - Your email',
    '{{sales_rep_phone}} - Your phone',
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Mail className="h-6 w-6 text-blue-600" />
            Email Templates
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Create and manage reusable email templates for sequences
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          New Template
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'All Categories' : cat.replace('_', ' ').toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-1">{template.name}</h3>
                  <p className="text-xs text-slate-500 capitalize">{template.category}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => duplicateTemplate.mutate(template)}
                    className="p-1 text-slate-400 hover:text-blue-600"
                    title="Duplicate"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openEditModal(template)}
                    className="p-1 text-slate-400 hover:text-orange-600"
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this template?')) {
                        deleteTemplate.mutate(template.id);
                      }
                    }}
                    className="p-1 text-slate-400 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Subject:</p>
                  <p className="text-sm text-slate-900 line-clamp-1">{template.subject}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Body Preview:</p>
                  <p className="text-sm text-slate-600 line-clamp-2">{template.body}</p>
                </div>
              </div>

              {template.tags && template.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {template.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Used {template.usage_count || 0} times
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  template.is_active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {template.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </h3>
              <button
                onClick={resetForm}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Initial Outreach - Enterprise"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="outbound">Outbound</option>
                  <option value="nurture">Nurture</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="meeting">Meeting</option>
                  <option value="proposal">Proposal</option>
                  <option value="closing">Closing</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email Subject *
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                  placeholder="Quick question about {{company_name}}"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email Body *
                </label>
                <textarea
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  required
                  rows={8}
                  placeholder="Hi {{first_name}},&#10;&#10;I noticed that {{company_name}} is..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg font-mono text-sm"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Available Variables:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                  {variablesHelp.map((variable, idx) => (
                    <div key={idx} className="font-mono">{variable}</div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="is_active" className="text-sm text-slate-700">
                  Active (available for use in sequences)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTemplate.isPending || updateTemplate.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
