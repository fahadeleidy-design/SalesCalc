import { useState, useEffect, useCallback } from 'react';
import {
  Wrench, Plus, Calendar, MapPin, Phone, User, CheckCircle2,
  Clock, AlertTriangle, X, ChevronDown, ChevronUp, Search,
  ClipboardCheck, Truck
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Installation {
  id: string;
  installation_number: string;
  shipment_id: string | null;
  job_order_id: string | null;
  customer_id: string | null;
  status: string;
  priority: string;
  scheduled_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  installation_team_lead: string;
  team_members: string;
  site_address: string;
  site_contact_name: string;
  site_contact_phone: string;
  notes: string;
  completion_notes: string;
  customer_sign_off: boolean;
  sign_off_name: string;
  sign_off_date: string | null;
  issues_reported: string;
  assigned_to: string | null;
  created_at: string;
  customer?: { company_name: string } | null;
  job_order?: { job_order_number: string } | null;
  shipment?: { shipment_number: string } | null;
}

interface ChecklistItem {
  id: string;
  installation_id: string;
  item_description: string;
  is_completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  notes: string;
  sort_order: number;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  scheduled: { label: 'Scheduled', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  in_progress: { label: 'In Progress', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  completed: { label: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  on_hold: { label: 'On Hold', color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: 'text-red-600 bg-red-50' },
  high: { label: 'High', color: 'text-orange-600 bg-orange-50' },
  normal: { label: 'Normal', color: 'text-blue-600 bg-blue-50' },
  low: { label: 'Low', color: 'text-slate-600 bg-slate-50' },
};

export default function InstallationTrackingPage() {
  const { profile } = useAuth();
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedInstallation, setSelectedInstallation] = useState<Installation | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    scheduled_date: '',
    priority: 'normal',
    installation_team_lead: '',
    team_members: '',
    site_address: '',
    site_contact_name: '',
    site_contact_phone: '',
    notes: '',
    customer_id: '',
    job_order_id: '',
  });

  const [customers, setCustomers] = useState<{ id: string; company_name: string }[]>([]);
  const [jobOrders, setJobOrders] = useState<{ id: string; job_order_number: string }[]>([]);

  const canManage = profile?.role && ['logistics', 'manager', 'admin'].includes(profile.role);

  const loadInstallations = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('installations')
        .select('*, customer:customers(company_name), job_order:job_orders(job_order_number), shipment:shipments(shipment_number)')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      setInstallations(data || []);
    } catch (err) {
      console.error('Error loading installations:', err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  const loadDropdowns = useCallback(async () => {
    const [custRes, joRes] = await Promise.all([
      supabase.from('customers').select('id, company_name').order('company_name'),
      supabase.from('job_orders').select('id, job_order_number').order('created_at', { ascending: false }).limit(50),
    ]);
    setCustomers(custRes.data || []);
    setJobOrders(joRes.data || []);
  }, []);

  const loadChecklist = useCallback(async (installationId: string) => {
    const { data } = await supabase
      .from('installation_checklists')
      .select('*')
      .eq('installation_id', installationId)
      .order('sort_order');
    setChecklist(data || []);
  }, []);

  useEffect(() => {
    loadInstallations();
    loadDropdowns();
  }, [loadInstallations, loadDropdowns]);

  const handleCreate = async () => {
    if (!formData.site_address || !formData.installation_team_lead) {
      toast.error('Site address and team lead are required');
      return;
    }

    try {
      const installNumber = `INS-${Date.now()}`;
      const { error } = await supabase.from('installations').insert({
        installation_number: installNumber,
        customer_id: formData.customer_id || null,
        job_order_id: formData.job_order_id || null,
        scheduled_date: formData.scheduled_date || null,
        priority: formData.priority,
        installation_team_lead: formData.installation_team_lead,
        team_members: formData.team_members,
        site_address: formData.site_address,
        site_contact_name: formData.site_contact_name,
        site_contact_phone: formData.site_contact_phone,
        notes: formData.notes,
        created_by: profile?.id,
        assigned_to: profile?.id,
      });

      if (error) throw error;
      toast.success('Installation scheduled');
      setShowForm(false);
      setFormData({
        scheduled_date: '',
        priority: 'normal',
        installation_team_lead: '',
        team_members: '',
        site_address: '',
        site_contact_name: '',
        site_contact_phone: '',
        notes: '',
        customer_id: '',
        job_order_id: '',
      });
      loadInstallations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create installation');
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'in_progress' && !installations.find(i => i.id === id)?.actual_start_date) {
        updates.actual_start_date = new Date().toISOString().split('T')[0];
      }
      if (newStatus === 'completed') {
        updates.actual_end_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase.from('installations').update(updates).eq('id', id);
      if (error) throw error;
      toast.success(`Status updated to ${statusConfig[newStatus]?.label || newStatus}`);
      loadInstallations();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleSignOff = async (id: string, signOffName: string) => {
    try {
      const { error } = await supabase.from('installations').update({
        customer_sign_off: true,
        sign_off_name: signOffName,
        sign_off_date: new Date().toISOString(),
        status: 'completed',
        actual_end_date: new Date().toISOString().split('T')[0],
      }).eq('id', id);

      if (error) throw error;
      toast.success('Customer sign-off recorded');
      loadInstallations();
      setSelectedInstallation(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to record sign-off');
    }
  };

  const toggleChecklistItem = async (itemId: string, completed: boolean) => {
    try {
      const { error } = await supabase.from('installation_checklists').update({
        is_completed: completed,
        completed_by: completed ? profile?.id : null,
        completed_at: completed ? new Date().toISOString() : null,
      }).eq('id', itemId);

      if (error) throw error;
      if (selectedInstallation) loadChecklist(selectedInstallation.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update checklist');
    }
  };

  const addChecklistItem = async (installationId: string, description: string) => {
    try {
      const { error } = await supabase.from('installation_checklists').insert({
        installation_id: installationId,
        item_description: description,
        sort_order: checklist.length,
      });

      if (error) throw error;
      loadChecklist(installationId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add checklist item');
    }
  };

  const filtered = installations.filter(inst => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      inst.installation_number.toLowerCase().includes(term) ||
      inst.customer?.company_name?.toLowerCase().includes(term) ||
      inst.site_address.toLowerCase().includes(term) ||
      inst.installation_team_lead.toLowerCase().includes(term)
    );
  });

  const stats = {
    total: installations.length,
    scheduled: installations.filter(i => i.status === 'scheduled').length,
    inProgress: installations.filter(i => i.status === 'in_progress').length,
    completed: installations.filter(i => i.status === 'completed').length,
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-lg" />)}
          </div>
          <div className="h-96 bg-slate-200 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Wrench className="text-teal-600" size={28} />
            Installation Tracking
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage delivery installations and customer sign-offs</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
          >
            <Plus size={18} />
            Schedule Installation
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Installations" value={stats.total} icon={ClipboardCheck} color="slate" />
        <StatCard label="Scheduled" value={stats.scheduled} icon={Calendar} color="blue" />
        <StatCard label="In Progress" value={stats.inProgress} icon={Clock} color="amber" />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} color="emerald" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by number, customer, address, or team lead..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
        >
          <option value="all">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="on_hold">On Hold</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
            <Wrench className="mx-auto text-slate-300 mb-3" size={48} />
            <p className="text-slate-500 font-medium">No installations found</p>
            <p className="text-sm text-slate-400 mt-1">Schedule a new installation to get started</p>
          </div>
        ) : (
          filtered.map((inst) => {
            const sc = statusConfig[inst.status] || statusConfig.scheduled;
            const pc = priorityConfig[inst.priority] || priorityConfig.normal;
            const isExpanded = expandedId === inst.id;

            return (
              <div
                key={inst.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors"
              >
                <div
                  className="flex items-center justify-between p-5 cursor-pointer"
                  onClick={() => {
                    setExpandedId(isExpanded ? null : inst.id);
                    if (!isExpanded) {
                      setSelectedInstallation(inst);
                      loadChecklist(inst.id);
                    }
                  }}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`p-2.5 rounded-lg border ${sc.bg}`}>
                      <Wrench className={sc.color} size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-semibold text-slate-900">{inst.installation_number}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${sc.bg} ${sc.color}`}>
                          {sc.label}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pc.color}`}>
                          {pc.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-500 flex-wrap">
                        {inst.customer?.company_name && (
                          <span className="flex items-center gap-1">
                            <User size={14} />
                            {inst.customer.company_name}
                          </span>
                        )}
                        {inst.scheduled_date && (
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {format(new Date(inst.scheduled_date), 'MMM d, yyyy')}
                          </span>
                        )}
                        {inst.site_address && (
                          <span className="flex items-center gap-1 truncate max-w-xs">
                            <MapPin size={14} />
                            {inst.site_address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {inst.customer_sign_off && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full">
                        <CheckCircle2 size={14} />
                        Signed Off
                      </span>
                    )}
                    {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 p-5 bg-slate-50">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-slate-900 text-sm uppercase tracking-wide">Details</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-slate-500 block">Team Lead</span>
                            <span className="font-medium text-slate-900">{inst.installation_team_lead || '-'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Team Members</span>
                            <span className="font-medium text-slate-900">{inst.team_members || '-'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Site Contact</span>
                            <span className="font-medium text-slate-900">{inst.site_contact_name || '-'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Phone</span>
                            <span className="font-medium text-slate-900 flex items-center gap-1">
                              {inst.site_contact_phone ? (
                                <><Phone size={14} className="text-slate-400" /> {inst.site_contact_phone}</>
                              ) : '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Job Order</span>
                            <span className="font-medium text-slate-900">{inst.job_order?.job_order_number || '-'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Shipment</span>
                            <span className="font-medium text-slate-900">{inst.shipment?.shipment_number || '-'}</span>
                          </div>
                          {inst.actual_start_date && (
                            <div>
                              <span className="text-slate-500 block">Started</span>
                              <span className="font-medium text-slate-900">{format(new Date(inst.actual_start_date), 'MMM d, yyyy')}</span>
                            </div>
                          )}
                          {inst.actual_end_date && (
                            <div>
                              <span className="text-slate-500 block">Completed</span>
                              <span className="font-medium text-slate-900">{format(new Date(inst.actual_end_date), 'MMM d, yyyy')}</span>
                            </div>
                          )}
                        </div>
                        {inst.notes && (
                          <div>
                            <span className="text-slate-500 text-sm block mb-1">Notes</span>
                            <p className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-200">{inst.notes}</p>
                          </div>
                        )}
                        {inst.issues_reported && (
                          <div>
                            <span className="text-red-500 text-sm block mb-1 flex items-center gap-1">
                              <AlertTriangle size={14} /> Issues Reported
                            </span>
                            <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">{inst.issues_reported}</p>
                          </div>
                        )}

                        {canManage && inst.status !== 'completed' && inst.status !== 'cancelled' && (
                          <div className="flex gap-2 pt-2">
                            {inst.status === 'scheduled' && (
                              <button
                                onClick={() => updateStatus(inst.id, 'in_progress')}
                                className="px-3 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 transition-colors"
                              >
                                Start Installation
                              </button>
                            )}
                            {inst.status === 'in_progress' && (
                              <button
                                onClick={() => updateStatus(inst.id, 'completed')}
                                className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors"
                              >
                                Mark Complete
                              </button>
                            )}
                            {inst.status !== 'on_hold' && (
                              <button
                                onClick={() => updateStatus(inst.id, 'on_hold')}
                                className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm hover:bg-slate-300 transition-colors"
                              >
                                Put On Hold
                              </button>
                            )}
                            {inst.status === 'on_hold' && (
                              <button
                                onClick={() => updateStatus(inst.id, 'in_progress')}
                                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                              >
                                Resume
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold text-slate-900 text-sm uppercase tracking-wide">Installation Checklist</h4>
                        <ChecklistPanel
                          checklist={checklist}
                          canManage={!!canManage}
                          onToggle={toggleChecklistItem}
                          onAdd={(desc) => addChecklistItem(inst.id, desc)}
                        />

                        {canManage && inst.status === 'completed' && !inst.customer_sign_off && (
                          <SignOffPanel onSignOff={(name) => handleSignOff(inst.id, name)} />
                        )}

                        {inst.customer_sign_off && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle2 className="text-emerald-600" size={20} />
                              <span className="font-semibold text-emerald-800">Customer Signed Off</span>
                            </div>
                            <p className="text-sm text-emerald-700">
                              Signed by: <strong>{inst.sign_off_name}</strong>
                              {inst.sign_off_date && ` on ${format(new Date(inst.sign_off_date), 'MMM d, yyyy h:mm a')}`}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Schedule Installation</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
                  <select
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">Select customer...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Job Order</label>
                  <select
                    value={formData.job_order_id}
                    onChange={(e) => setFormData({ ...formData, job_order_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">Select job order...</option>
                    {jobOrders.map(j => <option key={j.id} value={j.id}>{j.job_order_number}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Team Lead *</label>
                <input
                  type="text"
                  value={formData.installation_team_lead}
                  onChange={(e) => setFormData({ ...formData, installation_team_lead: e.target.value })}
                  placeholder="Name of the installation team lead"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Team Members</label>
                <input
                  type="text"
                  value={formData.team_members}
                  onChange={(e) => setFormData({ ...formData, team_members: e.target.value })}
                  placeholder="Comma-separated names"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Site Address *</label>
                <input
                  type="text"
                  value={formData.site_address}
                  onChange={(e) => setFormData({ ...formData, site_address: e.target.value })}
                  placeholder="Full installation site address"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Site Contact Name</label>
                  <input
                    type="text"
                    value={formData.site_contact_name}
                    onChange={(e) => setFormData({ ...formData, site_contact_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Site Contact Phone</label>
                  <input
                    type="text"
                    value={formData.site_contact_phone}
                    onChange={(e) => setFormData({ ...formData, site_contact_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Any special instructions or requirements..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium transition-colors"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  const colorMap: Record<string, { bg: string; text: string; val: string }> = {
    slate: { bg: 'bg-slate-50', text: 'text-slate-500', val: 'text-slate-900' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', val: 'text-blue-900' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', val: 'text-amber-900' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', val: 'text-emerald-900' },
  };
  const c = colorMap[color] || colorMap.slate;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${c.bg}`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium">{label}</p>
          <p className={`text-2xl font-bold ${c.val}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function ChecklistPanel({
  checklist,
  canManage,
  onToggle,
  onAdd,
}: {
  checklist: ChecklistItem[];
  canManage: boolean;
  onToggle: (id: string, completed: boolean) => void;
  onAdd: (description: string) => void;
}) {
  const [newItem, setNewItem] = useState('');

  return (
    <div className="space-y-2">
      {checklist.map((item) => (
        <label
          key={item.id}
          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
            item.is_completed
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <input
            type="checkbox"
            checked={item.is_completed}
            onChange={(e) => canManage && onToggle(item.id, e.target.checked)}
            disabled={!canManage}
            className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
          />
          <span className={`text-sm flex-1 ${item.is_completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
            {item.item_description}
          </span>
        </label>
      ))}
      {checklist.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-4">No checklist items yet</p>
      )}
      {canManage && (
        <div className="flex gap-2 pt-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add checklist item..."
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newItem.trim()) {
                onAdd(newItem.trim());
                setNewItem('');
              }
            }}
          />
          <button
            onClick={() => {
              if (newItem.trim()) {
                onAdd(newItem.trim());
                setNewItem('');
              }
            }}
            className="px-3 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function SignOffPanel({ onSignOff }: { onSignOff: (name: string) => void }) {
  const [name, setName] = useState('');

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h5 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
        <ClipboardCheck size={18} />
        Customer Sign-Off
      </h5>
      <div className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Customer representative name"
          className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white"
        />
        <button
          onClick={() => {
            if (name.trim()) onSignOff(name.trim());
          }}
          disabled={!name.trim()}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Record Sign-Off
        </button>
      </div>
    </div>
  );
}
