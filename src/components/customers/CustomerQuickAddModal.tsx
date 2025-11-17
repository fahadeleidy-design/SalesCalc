import { useState } from 'react';
import { X, Building2, Mail, Phone, MapPin, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CustomerQuickAddModalProps {
  onClose: () => void;
  onCustomerAdded: (customerId: string, customerName: string) => void;
}

export default function CustomerQuickAddModal({
  onClose,
  onCustomerAdded,
}: CustomerQuickAddModalProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    customer_type: '',
    sector: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.company_name || !formData.email) {
      alert('Company name and email are required');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          company_name: formData.company_name,
          contact_person: formData.contact_person,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          customer_type: formData.customer_type || null,
          sector: formData.sector || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        onCustomerAdded(data.id, data.company_name);
      }
    } catch (error: any) {
      console.error('Error adding customer:', error);
      alert('Failed to add customer: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-bold text-slate-900">Add New Customer</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Building2 className="w-4 h-4" />
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Acme Corporation"
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <User className="w-4 h-4" />
              Contact Person
            </label>
            <input
              type="text"
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Mail className="w-4 h-4" />
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="john@acme.com"
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Phone className="w-4 h-4" />
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="+966 50 123 4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Customer Type
            </label>
            <select
              value={formData.customer_type}
              onChange={(e) => setFormData({ ...formData, customer_type: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
            >
              <option value="">Select Type</option>
              <option value="direct_sales">Direct Sales</option>
              <option value="partner">Partner</option>
              <option value="distributor">Distributor</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Industry Sector
            </label>
            <select
              value={formData.sector}
              onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
            >
              <option value="">Select Industry Sector</option>
              <option value="government">Government</option>
              <option value="financial">Financial Sector (Banks, Insurance, Investment)</option>
              <option value="telecommunications">Telecommunications Sector (Telecom, ISPs)</option>
              <option value="corporate_private">Corporate & Private Sector</option>
              <option value="healthcare">Health Sector (Hospitals, Clinics, Healthcare)</option>
              <option value="education">Educational Sector (Schools, Universities, Training)</option>
              <option value="hospitality">Hospitality Sector (Hotels, Restaurants, Tourism)</option>
              <option value="startups_tech">Technology Sector (IT, Software, Startups)</option>
              <option value="manufacturing_sector">Manufacturing Sector (Factories, Production)</option>
              <option value="retail_sector">Retail Sector (Stores, E-commerce, Shopping)</option>
              <option value="construction_sector">Construction Sector (Building, Real Estate Development)</option>
              <option value="transportation_sector">Transportation Sector (Logistics, Shipping, Airlines)</option>
              <option value="energy_sector">Energy Sector (Oil, Gas, Renewable Energy)</option>
              <option value="real_estate_sector">Real Estate Sector (Property Management, Brokers)</option>
              <option value="media_entertainment_sector">Media & Entertainment Sector (Publishing, Broadcasting)</option>
              <option value="agriculture_sector">Agriculture Sector (Farming, Food Production)</option>
              <option value="legal_services_sector">Legal Services Sector (Law Firms, Legal Consulting)</option>
              <option value="consulting_services_sector">Consulting Services Sector (Business, Management Consulting)</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <MapPin className="w-4 h-4" />
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="123 Business St, Riyadh, Saudi Arabia"
            />
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Adding Customer...' : 'Add Customer'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
