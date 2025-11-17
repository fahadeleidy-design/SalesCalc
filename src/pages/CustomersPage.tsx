import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Search, Mail, Phone, MapPin, Building, Upload, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import type { Database } from '../lib/database.types';
import toast from 'react-hot-toast';

type Customer = Database['public']['Tables']['customers']['Row'];

export default function CustomersPage() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    tax_id: '',
    customer_type: '',
    sector: '',
  });

  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager';

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          creator:created_by(full_name),
          sales_rep:assigned_sales_rep(full_name)
        `)
        .order('company_name');

      if (error) {
        console.error('Error loading customers:', error);
        toast.error(`Failed to load customers: ${error.message}`);
        setCustomers([]);
      } else {
        setCustomers(data || []);
      }
    } catch (error: any) {
      console.error('Exception loading customers:', error);
      toast.error('Failed to load customers');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.company_name || !formData.contact_person || !formData.email) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(formData as any)
          .eq('id', editingCustomer.id);

        if (error) throw error;
        alert('Customer updated successfully');
      } else {
        const { error } = await supabase.from('customers').insert([{
          ...formData,
          created_by: profile?.id
        } as any]);

        if (error) throw error;
        alert('Customer added successfully');
      }

      setShowModal(false);
      setEditingCustomer(null);
      setFormData({
        company_name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: '',
        tax_id: '',
        customer_type: '',
        sector: '',
      });
      loadCustomers();
    } catch (error: any) {
      console.error('Error saving customer:', error);
      alert('Failed to save customer: ' + error.message);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      company_name: customer.company_name,
      contact_person: customer.contact_person,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      city: customer.city || '',
      country: customer.country || '',
      tax_id: customer.tax_id || '',
      customer_type: customer.customer_type || '',
      sector: customer.sector || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);

      if (error) throw error;
      toast.success('Customer deleted successfully');
      loadCustomers();
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer: ' + error.message);
    }
  };

  const handleImportFromCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        toast.error('Invalid file format. File must contain headers and at least one customer.');
        return;
      }

      const customersToImport: any[] = [];

      // CSV format: Company Name, Contact Person, Email, Phone, Address, City, Country, Tax ID, Customer Type, Sector, Notes
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)?.map(v => v.trim().replace(/^"|"$/g, ''));
        if (!values || values.length < 3) continue;

        const [company_name, contact_person, email, phone, address, city, country, tax_id, customer_type, sector, notes] = values;

        if (!company_name || !contact_person || !email) continue;

        customersToImport.push({
          company_name,
          contact_person,
          email,
          phone: phone || '',
          address: address || '',
          city: city || '',
          country: country || '',
          tax_id: tax_id || '',
          customer_type: customer_type || null,
          sector: sector || null,
          notes: notes || '',
        });
      }

      if (customersToImport.length === 0) {
        toast.error('No valid customers found in the file.');
        return;
      }

      try {
        setUploading(true);

        // Use bulk import function
        const { data, error } = await supabase.rpc('bulk_import_customers', {
          p_customers: customersToImport,
          p_file_name: file.name
        });

        if (error) throw error;

        const result = data as any;

        if (result.failed > 0) {
          toast(
            `Import completed with warnings:\n✅ Successful: ${result.successful}\n❌ Failed: ${result.failed}`,
            { duration: 5000 }
          );
          console.error('Import errors:', result.errors);
        } else {
          toast.success(`✅ Successfully imported ${result.successful} customers!`);
        }

        loadCustomers();
      } catch (error: any) {
        console.error('Error importing customers:', error);
        toast.error('Failed to import customers: ' + error.message);
      } finally {
        setUploading(false);
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  const handleExportToCSV = () => {
    if (customers.length === 0) {
      toast.error('No customers to export');
      return;
    }

    // CSV Headers
    const headers = [
      'Company Name',
      'Contact Person',
      'Email',
      'Phone',
      'Address',
      'City',
      'Country',
      'Tax ID',
      'Customer Type',
      'Sector',
      'Notes'
    ];

    // Convert customers to CSV rows
    const rows = customers.map(customer => [
      customer.company_name,
      customer.contact_person,
      customer.email || '',
      customer.phone || '',
      customer.address || '',
      customer.city || '',
      customer.country || '',
      customer.tax_id || '',
      customer.customer_type || '',
      customer.sector || '',
      customer.notes || ''
    ]);

    // Escape CSV values that contain commas or quotes
    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}`;
      }
      return value;
    };

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${customers.length} customers to CSV`);
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.customers.title}</h1>
          <p className="text-slate-600 mt-1">{t.customers.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <>
              <button
                onClick={handleExportToCSV}
                disabled={customers.length === 0}
                className="flex items-center gap-2 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
                title="Export customers to CSV"
              >
                <Download className="w-5 h-5" />
                Export CSV
              </button>
              <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors cursor-pointer">
                <Upload className="w-5 h-5" />
                {uploading ? 'Importing...' : 'Import CSV'}
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportFromCSV}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </>
          )}
          <button
            onClick={() => {
              setEditingCustomer(null);
              setFormData({
                company_name: '',
                contact_person: '',
                email: '',
                phone: '',
                address: '',
                city: '',
                country: '',
                tax_id: '',
              });
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t.customers.addCustomer}
          </button>
        </div>
      </div>

      {isAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">CSV Import Format</h3>
              <p className="text-sm text-blue-700 mb-2">
                Your CSV file should have the following columns in this exact order:
              </p>
              <code className="text-xs bg-white px-2 py-1 rounded border border-blue-200 text-blue-900 block">
                Company Name, Contact Person, Email, Phone, Address, City, Country, Tax ID, Customer Type, Sector, Notes
              </code>
              <p className="text-xs text-blue-600 mt-2">
                First row should be headers. Duplicate emails will update existing customers.
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Customer Type: direct_sales, partner, distributor | Sector: government, financial, telecommunications, corporate_private, healthcare, education, hospitality, startups_tech
              </p>
            </div>
          </div>
        </div>
      )}

      {customers.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customers..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>
      )}

      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {customers.length === 0 ? 'No Customers Yet' : 'No Customers Found'}
          </h3>
          <p className="text-slate-600 mb-6">
            {customers.length === 0
              ? 'Start building your customer database. Add company details, contacts, and track your relationships.'
              : 'Try adjusting your search terms'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="bg-orange-50 p-3 rounded-lg">
                  <Building className="w-6 h-6 text-orange-500" />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(customer)}
                    className="p-1.5 text-orange-500 hover:bg-orange-50 rounded"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(customer.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-slate-900 mb-1">{customer.company_name}</h3>
              <p className="text-sm text-slate-600 mb-4">{customer.contact_person}</p>

              <div className="space-y-2">
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.city && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {customer.city}
                      {customer.country && `, ${customer.country}`}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Created by: <span className="font-medium text-slate-600">{(customer as any).creator?.full_name || 'Unknown'}</span>
                  </span>
                  {customer.created_at && (
                    <span>
                      {new Date(customer.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t.customers.companyName} *
                  </label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t.customers.contactPerson} *
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tax ID</label>
                  <input
                    type="text"
                    value={formData.tax_id}
                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Customer Category *
                  </label>
                  <select
                    value={formData.customer_type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setFormData({
                        ...formData,
                        customer_type: newType,
                        // Clear sector if not direct_sales
                        sector: newType === 'direct_sales' ? formData.sector : '',
                      });
                    }}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
                  >
                    <option value="">Select Customer Category</option>
                    <option value="government">Government (Direct contact with government entities)</option>
                    <option value="direct_sales">Direct Sales (Direct contact and billing with end user)</option>
                    <option value="partners">Partners (Direct contact but billing through partner)</option>
                    <option value="distributors">Distributors (Contact and billing with distributor only)</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    {formData.customer_type === 'government' && '→ Government entities - No sector required'}
                    {formData.customer_type === 'direct_sales' && '→ Direct B2B sales - Must select a sector below'}
                    {formData.customer_type === 'partners' && '→ End user contact through partner - No sector required'}
                    {formData.customer_type === 'distributors' && '→ Distributor relationship only - No sector required'}
                  </p>
                </div>

                {formData.customer_type === 'direct_sales' && (
                  <div className="col-span-2 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Industry Sector * <span className="text-orange-600">(Required for Direct Sales)</span>
                    </label>
                    <select
                      value={formData.sector}
                      onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
                    >
                      <option value="">Select Industry Sector</option>
                      <option value="government">Government</option>
                      <option value="financial">Financial (Banks, Insurance, Investment)</option>
                      <option value="telecommunications">Telecommunications (Telecom, ISPs)</option>
                      <option value="corporate_private">Corporate & Private</option>
                      <option value="healthcare">Healthcare (Hospitals, Clinics, Medical)</option>
                      <option value="education">Education (Schools, Universities, Training)</option>
                      <option value="hospitality">Hospitality (Hotels, Restaurants, Tourism)</option>
                      <option value="startups_tech">Startups & Tech (IT, Software, Technology)</option>
                    </select>
                    <p className="text-xs text-slate-600 mt-2">
                      ℹ️ Sector classification helps track market penetration and tailor solutions to industry needs.
                    </p>
                  </div>
                )}

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                >
                  {editingCustomer ? t.common.edit + ' ' + t.customers.title.slice(0, -1) : t.customers.addCustomer}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
