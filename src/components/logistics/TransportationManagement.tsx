import { useState, useEffect, useCallback } from 'react';
import {
  Truck, Plus, X, Save, Edit3, DollarSign, MapPin, Clock, Package, TrendingUp, Search
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../lib/currencyUtils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Carrier {
  id: string;
  carrier_name: string;
  carrier_code: string;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  service_types: string[];
  rating: number | null;
  is_active: boolean;
  notes: string | null;
}

interface FreightRate {
  id: string;
  carrier_id: string;
  service_type: string;
  origin_zone: string | null;
  destination_zone: string | null;
  min_weight_kg: number;
  max_weight_kg: number;
  rate_per_kg: number;
  flat_rate: number;
  currency: string;
  valid_from: string;
  valid_until: string | null;
  carrier?: { carrier_name: string };
}

const serviceTypes = [
  'Standard Ground',
  'Express',
  'Overnight',
  'International',
  'Freight LTL',
  'Freight FTL',
  'Air Freight',
  'Ocean Freight',
];

export default function TransportationManagement() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'carriers' | 'rates'>('carriers');
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [rates, setRates] = useState<FreightRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCarrierForm, setShowCarrierForm] = useState(false);
  const [showRateForm, setShowRateForm] = useState(false);
  const [editingCarrierId, setEditingCarrierId] = useState<string | null>(null);
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [carrierForm, setCarrierForm] = useState({
    carrier_name: '',
    carrier_code: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    service_types: [] as string[],
    rating: 5,
    notes: '',
  });
  const [rateForm, setRateForm] = useState({
    carrier_id: '',
    service_type: 'Standard Ground',
    origin_zone: '',
    destination_zone: '',
    min_weight_kg: 0,
    max_weight_kg: 1000,
    rate_per_kg: 0,
    flat_rate: 0,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
  });

  const loadData = useCallback(async () => {
    try {
      const [carriersRes, ratesRes] = await Promise.all([
        supabase.from('carriers').select('*').order('carrier_name'),
        supabase
          .from('freight_rates')
          .select('*, carrier:carriers(carrier_name)')
          .order('valid_from', { ascending: false }),
      ]);

      setCarriers(carriersRes.data || []);
      setRates(ratesRes.data || []);
    } catch (err) {
      console.error('Failed to load transportation data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveCarrier = async () => {
    if (!carrierForm.carrier_name || !carrierForm.carrier_code) {
      toast.error('Carrier name and code are required');
      return;
    }
    try {
      const payload = {
        carrier_name: carrierForm.carrier_name,
        carrier_code: carrierForm.carrier_code,
        contact_person: carrierForm.contact_person || null,
        contact_phone: carrierForm.contact_phone || null,
        contact_email: carrierForm.contact_email || null,
        service_types: carrierForm.service_types,
        rating: carrierForm.rating,
        notes: carrierForm.notes || null,
        created_by: profile?.id,
      };

      if (editingCarrierId) {
        const { error } = await supabase.from('carriers').update(payload).eq('id', editingCarrierId);
        if (error) throw error;
        toast.success('Carrier updated');
      } else {
        const { error } = await supabase.from('carriers').insert(payload);
        if (error) throw error;
        toast.success('Carrier created');
      }

      setShowCarrierForm(false);
      setEditingCarrierId(null);
      setCarrierForm({
        carrier_name: '', carrier_code: '', contact_person: '', contact_phone: '',
        contact_email: '', service_types: [], rating: 5, notes: '',
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save carrier');
    }
  };

  const handleSaveRate = async () => {
    if (!rateForm.carrier_id || !rateForm.service_type) {
      toast.error('Carrier and service type are required');
      return;
    }
    try {
      const payload = {
        carrier_id: rateForm.carrier_id,
        service_type: rateForm.service_type,
        origin_zone: rateForm.origin_zone || null,
        destination_zone: rateForm.destination_zone || null,
        min_weight_kg: rateForm.min_weight_kg,
        max_weight_kg: rateForm.max_weight_kg,
        rate_per_kg: rateForm.rate_per_kg,
        flat_rate: rateForm.flat_rate,
        currency: 'SAR',
        valid_from: rateForm.valid_from,
        valid_until: rateForm.valid_until || null,
        created_by: profile?.id,
      };

      if (editingRateId) {
        const { error } = await supabase.from('freight_rates').update(payload).eq('id', editingRateId);
        if (error) throw error;
        toast.success('Rate updated');
      } else {
        const { error } = await supabase.from('freight_rates').insert(payload);
        if (error) throw error;
        toast.success('Rate created');
      }

      setShowRateForm(false);
      setEditingRateId(null);
      setRateForm({
        carrier_id: '', service_type: 'Standard Ground', origin_zone: '', destination_zone: '',
        min_weight_kg: 0, max_weight_kg: 1000, rate_per_kg: 0, flat_rate: 0,
        valid_from: new Date().toISOString().split('T')[0], valid_until: '',
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save rate');
    }
  };

  const handleEditCarrier = (carrier: Carrier) => {
    setEditingCarrierId(carrier.id);
    setCarrierForm({
      carrier_name: carrier.carrier_name,
      carrier_code: carrier.carrier_code,
      contact_person: carrier.contact_person || '',
      contact_phone: carrier.contact_phone || '',
      contact_email: carrier.contact_email || '',
      service_types: carrier.service_types || [],
      rating: carrier.rating || 5,
      notes: carrier.notes || '',
    });
    setShowCarrierForm(true);
  };

  const handleEditRate = (rate: FreightRate) => {
    setEditingRateId(rate.id);
    setRateForm({
      carrier_id: rate.carrier_id,
      service_type: rate.service_type,
      origin_zone: rate.origin_zone || '',
      destination_zone: rate.destination_zone || '',
      min_weight_kg: rate.min_weight_kg,
      max_weight_kg: rate.max_weight_kg,
      rate_per_kg: rate.rate_per_kg,
      flat_rate: rate.flat_rate,
      valid_from: rate.valid_from,
      valid_until: rate.valid_until || '',
    });
    setShowRateForm(true);
  };

  const toggleServiceType = (service: string) => {
    setCarrierForm(prev => ({
      ...prev,
      service_types: prev.service_types.includes(service)
        ? prev.service_types.filter(s => s !== service)
        : [...prev.service_types, service],
    }));
  };

  const filteredCarriers = carriers.filter(c =>
    !searchTerm || c.carrier_name.toLowerCase().includes(searchTerm.toLowerCase()) || c.carrier_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRates = rates.filter(r =>
    !searchTerm || r.carrier?.carrier_name.toLowerCase().includes(searchTerm.toLowerCase()) || r.service_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalCarriers: carriers.filter(c => c.is_active).length,
    totalRates: rates.length,
    avgRating: carriers.length > 0 ? (carriers.reduce((sum, c) => sum + (c.rating || 0), 0) / carriers.length).toFixed(1) : '0',
    activeRates: rates.filter(r => !r.valid_until || new Date(r.valid_until) >= new Date()).length,
  };

  if (loading) {
    return <div className="h-96 bg-white rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={Truck} label="Active Carriers" value={stats.totalCarriers} color="blue" />
        <KPI icon={DollarSign} label="Freight Rates" value={stats.totalRates} color="emerald" />
        <KPI icon={TrendingUp} label="Avg Rating" value={stats.avgRating} color="amber" />
        <KPI icon={Package} label="Active Rates" value={stats.activeRates} color="teal" />
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('carriers')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'carriers' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
        >
          <Truck className="w-4 h-4" /> Carriers
        </button>
        <button
          onClick={() => setActiveTab('rates')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'rates' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
        >
          <DollarSign className="w-4 h-4" /> Freight Rates
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'carriers' ? 'Search carriers...' : 'Search rates...'}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </div>
        {activeTab === 'carriers' ? (
          <button
            onClick={() => { setShowCarrierForm(true); setEditingCarrierId(null); setCarrierForm({ carrier_name: '', carrier_code: '', contact_person: '', contact_phone: '', contact_email: '', service_types: [], rating: 5, notes: '' }); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> New Carrier
          </button>
        ) : (
          <button
            onClick={() => { setShowRateForm(true); setEditingRateId(null); setRateForm({ carrier_id: '', service_type: 'Standard Ground', origin_zone: '', destination_zone: '', min_weight_kg: 0, max_weight_kg: 1000, rate_per_kg: 0, flat_rate: 0, valid_from: new Date().toISOString().split('T')[0], valid_until: '' }); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> New Rate
          </button>
        )}
      </div>

      {activeTab === 'carriers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCarriers.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No carriers found</p>
            </div>
          ) : filteredCarriers.map(carrier => (
            <div key={carrier.id} className={`bg-white rounded-xl border border-slate-200 p-5 ${!carrier.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-900">{carrier.carrier_name}</h3>
                  <p className="text-xs text-slate-500 font-mono">{carrier.carrier_code}</p>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={`w-3 h-3 rounded-full ${i < (carrier.rating || 0) ? 'bg-amber-400' : 'bg-slate-200'}`} />
                  ))}
                </div>
              </div>

              {carrier.contact_person && (
                <div className="mb-2 text-sm">
                  <p className="font-medium text-slate-700">{carrier.contact_person}</p>
                  {carrier.contact_phone && <p className="text-xs text-slate-500">{carrier.contact_phone}</p>}
                  {carrier.contact_email && <p className="text-xs text-slate-500">{carrier.contact_email}</p>}
                </div>
              )}

              <div className="flex flex-wrap gap-1 mb-3">
                {carrier.service_types.map(service => (
                  <span key={service} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium">
                    {service}
                  </span>
                ))}
              </div>

              <button
                onClick={() => handleEditCarrier(carrier)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit3 className="w-3 h-3" /> Edit
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'rates' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-medium text-slate-600">Carrier</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Service</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Route</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Weight Range (kg)</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Rate/kg</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Flat Rate</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Valid Until</th>
                <th className="px-4 py-3 text-center font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRates.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">No freight rates found</td></tr>
              ) : filteredRates.map(rate => (
                <tr key={rate.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{rate.carrier?.carrier_name}</td>
                  <td className="px-4 py-3 text-slate-600">{rate.service_type}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {rate.origin_zone && rate.destination_zone ? `${rate.origin_zone} → ${rate.destination_zone}` : 'Any'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{rate.min_weight_kg} - {rate.max_weight_kg}</td>
                  <td className="px-4 py-3 text-right font-medium text-emerald-600">{formatCurrency(rate.rate_per_kg)}</td>
                  <td className="px-4 py-3 text-right font-medium text-blue-600">{formatCurrency(rate.flat_rate)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {rate.valid_until ? format(new Date(rate.valid_until), 'MMM d, yyyy') : 'No expiry'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleEditRate(rate)} className="p-1 text-slate-400 hover:text-blue-600">
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCarrierForm && (
        <CarrierFormModal
          form={carrierForm}
          setForm={setCarrierForm}
          serviceTypes={serviceTypes}
          toggleServiceType={toggleServiceType}
          editing={!!editingCarrierId}
          onSave={handleSaveCarrier}
          onClose={() => { setShowCarrierForm(false); setEditingCarrierId(null); }}
        />
      )}

      {showRateForm && (
        <RateFormModal
          form={rateForm}
          setForm={setRateForm}
          carriers={carriers.filter(c => c.is_active)}
          serviceTypes={serviceTypes}
          editing={!!editingRateId}
          onSave={handleSaveRate}
          onClose={() => { setShowRateForm(false); setEditingRateId(null); }}
        />
      )}
    </div>
  );
}

function KPI({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-${color}-50`}>
          <Icon className={`w-4 h-4 text-${color}-600`} />
        </div>
        <div>
          <p className="text-[11px] text-slate-500 font-medium">{label}</p>
          <p className={`text-lg font-bold text-${color}-900`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function CarrierFormModal({ form, setForm, serviceTypes, toggleServiceType, editing, onSave, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-slate-900">{editing ? 'Edit Carrier' : 'New Carrier'}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Carrier Name *</label>
              <input value={form.carrier_name} onChange={e => setForm({ ...form, carrier_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Carrier Code *</label>
              <input value={form.carrier_code} onChange={e => setForm({ ...form, carrier_code: e.target.value })} placeholder="e.g., FDX, UPS" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
              <input value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Service Types</label>
            <div className="grid grid-cols-2 gap-2">
              {serviceTypes.map((service: string) => (
                <label key={service} className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={form.service_types.includes(service)}
                    onChange={() => toggleServiceType(service)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-slate-700">{service}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rating (1-5)</label>
            <input type="number" min={1} max={5} value={form.rating} onChange={e => setForm({ ...form, rating: parseInt(e.target.value) || 5 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            <Save className="w-4 h-4" /> {editing ? 'Update' : 'Create'} Carrier
          </button>
        </div>
      </div>
    </div>
  );
}

function RateFormModal({ form, setForm, carriers, serviceTypes, editing, onSave, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl">
        <div className="border-b border-slate-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{editing ? 'Edit Rate' : 'New Freight Rate'}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Carrier *</label>
              <select value={form.carrier_id} onChange={e => setForm({ ...form, carrier_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                <option value="">Select carrier...</option>
                {carriers.map((c: any) => <option key={c.id} value={c.id}>{c.carrier_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Service Type *</label>
              <select value={form.service_type} onChange={e => setForm({ ...form, service_type: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                {serviceTypes.map((s: string) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Origin Zone</label>
              <input value={form.origin_zone} onChange={e => setForm({ ...form, origin_zone: e.target.value })} placeholder="e.g., Riyadh" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Destination Zone</label>
              <input value={form.destination_zone} onChange={e => setForm({ ...form, destination_zone: e.target.value })} placeholder="e.g., Jeddah" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min Weight (kg)</label>
              <input type="number" min={0} value={form.min_weight_kg} onChange={e => setForm({ ...form, min_weight_kg: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Weight (kg)</label>
              <input type="number" min={0} value={form.max_weight_kg} onChange={e => setForm({ ...form, max_weight_kg: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rate per kg (SAR)</label>
              <input type="number" min={0} step={0.01} value={form.rate_per_kg} onChange={e => setForm({ ...form, rate_per_kg: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Flat Rate (SAR)</label>
              <input type="number" min={0} step={0.01} value={form.flat_rate} onChange={e => setForm({ ...form, flat_rate: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valid From</label>
              <input type="date" value={form.valid_from} onChange={e => setForm({ ...form, valid_from: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valid Until</label>
              <input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 p-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            <Save className="w-4 h-4" /> {editing ? 'Update' : 'Create'} Rate
          </button>
        </div>
      </div>
    </div>
  );
}
