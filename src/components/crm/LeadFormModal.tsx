import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useSalesTeam } from '../../hooks/useSalesTeam';
import { X, Building2, Users, MapPin, Target, Briefcase, DollarSign, Calendar, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

interface Lead {
  id: string;
  lead_type?: string;
  company_name: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  contact_person_title: string | null;
  position: string | null;
  industry: string | null;
  country: string;
  city: string | null;
  address: string | null;
  website: string | null;
  lead_source: string;
  lead_status: string;
  lead_score: number;
  estimated_value: number | null;
  expected_close_date: string | null;
  notes: string | null;
  assigned_to: string;
  project_details?: string | null;
  budget?: number | null;
  timeline?: string | null;
  company_details?: string | null;
  past_projects?: string | null;
  partnership_interest?: string | null;
  distribution_regions?: string | null;
  current_product_lines?: string | null;
  target_market?: string | null;
  annual_volume_potential?: number | null;
}

interface LeadFormModalProps {
  lead: Lead | null;
  onClose: () => void;
}

export default function LeadFormModal({ lead, onClose }: LeadFormModalProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: teamMembers } = useSalesTeam();
  const canAssign = ['manager', 'ceo', 'admin'].includes(profile?.role || '');

  const [formData, setFormData] = useState({
    lead_type: lead?.lead_type || 'direct_sales',
    company_name: lead?.company_name || '',
    contact_name: lead?.contact_name || '',
    contact_person_title: lead?.contact_person_title || '',
    contact_email: lead?.contact_email || '',
    contact_phone: lead?.contact_phone || '',
    industry: lead?.industry || '',
    country: lead?.country || 'Saudi Arabia',
    city: lead?.city || '',
    address: lead?.address || '',
    website: lead?.website || '',
    lead_source: lead?.lead_source || '',
    estimated_value: lead?.estimated_value || '',
    expected_close_date: lead?.expected_close_date || '',
    notes: lead?.notes || '',
    assigned_to: lead?.assigned_to || profile?.id || '',
    project_details: lead?.project_details || '',
    budget: lead?.budget || '',
    timeline: lead?.timeline || '',
    company_details: lead?.company_details || '',
    past_projects: lead?.past_projects || '',
    partnership_interest: lead?.partnership_interest || '',
    distribution_regions: lead?.distribution_regions || '',
    current_product_lines: lead?.current_product_lines || '',
    target_market: lead?.target_market || '',
    annual_volume_potential: lead?.annual_volume_potential || '',
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const baseData = {
        lead_type: formData.lead_type,
        company_name: formData.company_name,
        contact_name: formData.contact_name,
        contact_person_title: formData.contact_person_title,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        country: formData.country,
        city: formData.city || null,
        address: formData.address,
        website: formData.website || null,
        lead_source: formData.lead_source,
        estimated_value: formData.estimated_value ? Number(formData.estimated_value) : null,
        expected_close_date: formData.expected_close_date || null,
        notes: formData.notes || null,
      };

      // Add stream-specific fields
      const streamData: any = {};

      if (formData.lead_type === 'direct_sales') {
        streamData.industry = formData.industry || null;
        streamData.project_details = formData.project_details || null;
        streamData.budget = formData.budget ? Number(formData.budget) : null;
        streamData.timeline = formData.timeline || null;
      } else if (formData.lead_type === 'partners') {
        streamData.company_details = formData.company_details || null;
        streamData.past_projects = formData.past_projects || null;
        streamData.partnership_interest = formData.partnership_interest || null;
      } else if (formData.lead_type === 'distribution') {
        streamData.distribution_regions = formData.distribution_regions || null;
        streamData.current_product_lines = formData.current_product_lines || null;
        streamData.target_market = formData.target_market || null;
        streamData.annual_volume_potential = formData.annual_volume_potential ? Number(formData.annual_volume_potential) : null;
      }

      const fullData = { ...baseData, ...streamData };

      if (lead) {
        const updateData = {
          ...fullData,
          assigned_to: formData.assigned_to || profile?.id,
        };
        const { error } = await supabase
          .from('crm_leads')
          .update(updateData)
          .eq('id', lead.id);
        if (error) throw error;
      } else {
        const insertData = {
          ...fullData,
          ...(formData.assigned_to && formData.assigned_to !== profile?.id
            ? { assigned_to: formData.assigned_to }
            : {}),
        };
        const { error } = await supabase.from('crm_leads').insert(insertData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-stats'] });
      toast.success(lead ? 'Lead updated successfully' : 'Lead created successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save lead');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  const industryOptions = [
    { value: 'government_public_sector', label: 'Government & Public Sector' },
    { value: 'banking_finance', label: 'Banking & Finance' },
    { value: 'oil_gas', label: 'Oil & Gas' },
    { value: 'communications', label: 'Communications' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'education', label: 'Education' },
    { value: 'hospitality', label: 'Hospitality' },
    { value: 'large_corporations_smes', label: 'Large Corporations & SMEs' },
    { value: 'others', label: 'Others' },
  ];

  const isFormValid = () => {
    const baseValid =
      formData.company_name &&
      formData.contact_name &&
      formData.contact_person_title &&
      formData.contact_email &&
      formData.contact_phone &&
      formData.address &&
      formData.lead_source;

    if (formData.lead_type === 'direct_sales') {
      return baseValid && formData.industry;
    } else if (formData.lead_type === 'partners') {
      return baseValid && formData.company_details;
    } else if (formData.lead_type === 'distribution') {
      return baseValid && formData.distribution_regions;
    }

    return baseValid;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            {lead ? 'Edit Lead' : 'Add New Lead'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Lead Type Selection */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Sales Stream
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, lead_type: 'direct_sales' })}
                  className={`p-4 rounded-lg border-2 transition-all ${formData.lead_type === 'direct_sales'
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-slate-200 hover:border-slate-300'
                    }`}
                >
                  <Users className="h-5 w-5 mx-auto mb-2" />
                  <div className="text-sm font-semibold">Direct Sales</div>
                  <div className="text-xs text-slate-600 mt-1">End User</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, lead_type: 'partners' })}
                  className={`p-4 rounded-lg border-2 transition-all ${formData.lead_type === 'partners'
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-slate-200 hover:border-slate-300'
                    }`}
                >
                  <Briefcase className="h-5 w-5 mx-auto mb-2" />
                  <div className="text-sm font-semibold">Partners</div>
                  <div className="text-xs text-slate-600 mt-1">Construction</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, lead_type: 'distribution' })}
                  className={`p-4 rounded-lg border-2 transition-all ${formData.lead_type === 'distribution'
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-slate-200 hover:border-slate-300'
                    }`}
                >
                  <Building2 className="h-5 w-5 mx-auto mb-2" />
                  <div className="text-sm font-semibold">Distribution</div>
                  <div className="text-xs text-slate-600 mt-1">Distributors</div>
                </button>
              </div>
            </div>

            {/* Company Information */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Company Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {formData.lead_type === 'direct_sales' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Industry *
                    </label>
                    <select
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select Industry</option>
                      {industryOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-slate-700">Website</label>
                    {formData.website && formData.website.includes('.') && (
                      <button
                        type="button"
                        onClick={async () => {
                          const domain = formData.website.replace('https://', '').replace('http://', '').split('/')[0];
                          const toastId = toast.loading('Enriching lead data...');
                          try {
                            const { enrichCompanyByDomain } = await import('../../lib/apolloService');
                            const data = await enrichCompanyByDomain(domain);
                            setFormData(prev => ({
                              ...prev,
                              company_name: prev.company_name || data.name,
                              industry: prev.industry || '', // Map if possible
                              notes: (prev.notes || '') + '\n\n' + data.description + (data.linkedin_url ? `\nLinkedIn: ${data.linkedin_url}` : '')
                            }));
                            toast.success('Lead enriched!', { id: toastId });
                          } catch (err) {
                            toast.error('Enrichment failed', { id: toastId });
                          }
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-full transition-all active:scale-95"
                      >
                        <Zap className="h-2.5 w-2.5" />
                        ENRICH
                      </button>
                    )}
                  </div>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Lead Source *
                  </label>
                  <select
                    value={formData.lead_source}
                    onChange={(e) => setFormData({ ...formData, lead_source: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Source</option>
                    <option value="website">Website</option>
                    <option value="referral">Referral / Word of Mouth</option>
                    <option value="architect_designer">Architect / Design Firm (A&D)</option>
                    <option value="consultant_pm">Project Manager / Consultant</option>
                    <option value="general_contractor">General Contractor</option>
                    <option value="event">Trade Show / Exhibition</option>
                    <option value="email">Email Campaign</option>
                    <option value="phone">Cold Call / Phone</option>
                    <option value="social">Social Media (LinkedIn/Instagram)</option>
                    <option value="advertising">Advertising</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Contact Person Title *
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person_title}
                    onChange={(e) => setFormData({ ...formData, contact_person_title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., CEO, Purchasing Manager"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Contact Person Email *
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Contact Person Mobile *
                  </label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address *</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Stream-Specific Fields - Direct Sales */}
            {formData.lead_type === 'direct_sales' && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Project Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Project Details
                    </label>
                    <textarea
                      value={formData.project_details}
                      onChange={(e) => setFormData({ ...formData, project_details: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. Office fit-out for 500 workstations, Hotel lobby refurbishment, Healthcare seating requirements..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Budget (SAR)
                    </label>
                    <input
                      type="number"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Timeline
                    </label>
                    <input
                      type="text"
                      value={formData.timeline}
                      onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Q1 2024, 3-6 months"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Stream-Specific Fields - Partners */}
            {formData.lead_type === 'partners' && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Partnership Information
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Company Details *
                    </label>
                    <textarea
                      value={formData.company_details}
                      onChange={(e) => setFormData({ ...formData, company_details: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Company size, specialization, areas of expertise..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Past Projects
                    </label>
                    <textarea
                      value={formData.past_projects}
                      onChange={(e) => setFormData({ ...formData, past_projects: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Notable projects or experience..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Partnership Interest
                    </label>
                    <textarea
                      value={formData.partnership_interest}
                      onChange={(e) => setFormData({ ...formData, partnership_interest: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Subcontracting, project collaboration, joint ventures..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Stream-Specific Fields - Distribution */}
            {formData.lead_type === 'distribution' && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Distribution Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Distribution Regions *
                    </label>
                    <input
                      type="text"
                      value={formData.distribution_regions}
                      onChange={(e) => setFormData({ ...formData, distribution_regions: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Riyadh, Jeddah, Eastern Province"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Current Product Lines
                    </label>
                    <textarea
                      value={formData.current_product_lines}
                      onChange={(e) => setFormData({ ...formData, current_product_lines: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Products they currently distribute..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Target Market
                    </label>
                    <input
                      type="text"
                      value={formData.target_market}
                      onChange={(e) => setFormData({ ...formData, target_market: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Retail, B2B, Government"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Annual Volume Potential (SAR)
                    </label>
                    <input
                      type="number"
                      value={formData.annual_volume_potential}
                      onChange={(e) => setFormData({ ...formData, annual_volume_potential: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Additional Details */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Additional Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Estimated Value (SAR)
                  </label>
                  <input
                    type="number"
                    value={formData.estimated_value}
                    onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Expected Close Date
                  </label>
                  <input
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {canAssign && teamMembers && teamMembers.length > 0 && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Assign To
                    </label>
                    <select
                      value={formData.assigned_to}
                      onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Auto Assign</option>
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.full_name} ({member.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Additional information about this lead..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-6 border-t border-slate-200">
            <button
              type="submit"
              disabled={!isFormValid() || saveMutation.isPending}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              {saveMutation.isPending ? 'Saving...' : lead ? 'Update Lead' : 'Create Lead'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
