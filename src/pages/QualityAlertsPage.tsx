import { useState, useEffect, useCallback } from 'react';
import {
  Bell, CheckCircle, AlertTriangle, XOctagon, Info, Eye, EyeOff,
  Filter, Search, Clock, Shield
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface QualityAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof AlertTriangle; border: string }> = {
  critical: { label: 'Critical', color: 'text-red-700', bg: 'bg-red-50', icon: XOctagon, border: 'border-red-200' },
  warning: { label: 'Warning', color: 'text-amber-700', bg: 'bg-amber-50', icon: AlertTriangle, border: 'border-amber-200' },
  info: { label: 'Info', color: 'text-blue-700', bg: 'bg-blue-50', icon: Info, border: 'border-blue-200' },
};

const TYPE_LABELS: Record<string, string> = {
  defect_rate: 'Defect Rate',
  ncr_critical: 'Critical NCR',
  capa_overdue: 'CAPA Overdue',
  supplier_quality: 'Supplier Quality',
  inspection_fail_rate: 'Inspection Fail Rate',
  cost_threshold: 'Cost Threshold',
};

export default function QualityAlertsPage() {
  const { profile } = useAuth();
  const [alerts, setAlerts] = useState<QualityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('active');
  const [selectedAlert, setSelectedAlert] = useState<QualityAlert | null>(null);

  const canManage = profile?.role && ['admin', 'purchasing', 'engineering', 'project_manager', 'manager'].includes(profile.role);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('quality_alerts')
      .select('*')
      .order('created_at', { ascending: false });
    setAlerts((data || []) as QualityAlert[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  const handleResolve = async (alert: QualityAlert) => {
    const { error } = await supabase.from('quality_alerts').update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by: profile?.id,
    }).eq('id', alert.id);
    if (error) { toast.error('Failed to resolve'); return; }
    toast.success('Alert resolved');
    loadAlerts();
    if (selectedAlert?.id === alert.id) setSelectedAlert(null);
  };

  const handleMarkRead = async (alert: QualityAlert) => {
    if (alert.is_read) return;
    await supabase.from('quality_alerts').update({ is_read: true }).eq('id', alert.id);
    loadAlerts();
  };

  const handleBulkResolve = async () => {
    const unresolvedIds = filtered.filter(a => !a.is_resolved).map(a => a.id);
    if (unresolvedIds.length === 0) return;
    const { error } = await supabase.from('quality_alerts').update({
      is_resolved: true, resolved_at: new Date().toISOString(), resolved_by: profile?.id,
    }).in('id', unresolvedIds);
    if (error) toast.error('Failed');
    else { toast.success(`${unresolvedIds.length} alerts resolved`); loadAlerts(); }
  };

  const filtered = alerts.filter(a => {
    if (statusFilter === 'active' && a.is_resolved) return false;
    if (statusFilter === 'resolved' && !a.is_resolved) return false;
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return a.title.toLowerCase().includes(s) || a.message.toLowerCase().includes(s);
    }
    return true;
  });

  const stats = {
    total: alerts.filter(a => !a.is_resolved).length,
    critical: alerts.filter(a => !a.is_resolved && a.severity === 'critical').length,
    warning: alerts.filter(a => !a.is_resolved && a.severity === 'warning').length,
    info: alerts.filter(a => !a.is_resolved && a.severity === 'info').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quality Alerts</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor quality threshold breaches, critical NCRs, and overdue actions</p>
        </div>
        {canManage && stats.total > 0 && (
          <button onClick={handleBulkResolve}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            <CheckCircle className="w-4 h-4" /> Resolve All Visible
          </button>
        )}
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-500 font-medium">Active Alerts</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className={`rounded-xl p-4 ${stats.critical > 0 ? 'bg-red-50 border border-red-200' : 'bg-white border border-slate-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <XOctagon className={`w-4 h-4 ${stats.critical > 0 ? 'text-red-600' : 'text-slate-400'}`} />
            <span className={`text-xs font-medium ${stats.critical > 0 ? 'text-red-600' : 'text-slate-500'}`}>Critical</span>
          </div>
          <p className={`text-2xl font-bold ${stats.critical > 0 ? 'text-red-900' : 'text-slate-900'}`}>{stats.critical}</p>
        </div>
        <div className={`rounded-xl p-4 ${stats.warning > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-white border border-slate-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className={`w-4 h-4 ${stats.warning > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
            <span className={`text-xs font-medium ${stats.warning > 0 ? 'text-amber-600' : 'text-slate-500'}`}>Warnings</span>
          </div>
          <p className={`text-2xl font-bold ${stats.warning > 0 ? 'text-amber-900' : 'text-slate-900'}`}>{stats.warning}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Info className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-slate-500 font-medium">Informational</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.info}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search alerts..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
          {(['all', 'active', 'resolved'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${statusFilter === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2">
          <option value="all">All Severity</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">{statusFilter === 'active' ? 'No active alerts -- all clear!' : 'No alerts match your filters'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(alert => {
            const sc = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
            const IconComponent = sc.icon;
            return (
              <div key={alert.id}
                onClick={() => { setSelectedAlert(alert); handleMarkRead(alert); }}
                className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all hover:shadow-sm ${
                  alert.is_resolved ? 'bg-slate-50 border-slate-200 opacity-70'
                  : `${sc.bg} ${sc.border}`
                } ${!alert.is_read && !alert.is_resolved ? 'ring-1 ring-offset-1 ring-blue-200' : ''}`}>
                <div className={`mt-0.5 p-2 rounded-lg ${alert.is_resolved ? 'bg-slate-200' : sc.bg}`}>
                  <IconComponent className={`w-4 h-4 ${alert.is_resolved ? 'text-slate-400' : sc.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${sc.bg} ${sc.color}`}>
                      {TYPE_LABELS[alert.alert_type] || alert.alert_type}
                    </span>
                    {!alert.is_read && !alert.is_resolved && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full" title="Unread" />
                    )}
                    {alert.is_resolved && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700">Resolved</span>
                    )}
                  </div>
                  <p className={`text-sm font-medium ${alert.is_resolved ? 'text-slate-500' : 'text-slate-900'}`}>{alert.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{alert.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                  </p>
                </div>
                {canManage && !alert.is_resolved && (
                  <button onClick={e => { e.stopPropagation(); handleResolve(alert); }}
                    className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-lg hover:bg-emerald-200 shrink-0">
                    Resolve
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Drawer */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50" onClick={() => setSelectedAlert(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                {(() => {
                  const sc = SEVERITY_CONFIG[selectedAlert.severity] || SEVERITY_CONFIG.info;
                  const Icon = sc.icon;
                  return <Icon className={`w-5 h-5 ${sc.color}`} />;
                })()}
                <h2 className="text-lg font-bold text-slate-900">Alert Details</h2>
              </div>
              <button onClick={() => setSelectedAlert(null)} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Title</p>
                <p className="text-sm font-medium text-slate-900">{selectedAlert.title}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Message</p>
                <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{selectedAlert.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Type</p>
                  <p className="text-slate-900">{TYPE_LABELS[selectedAlert.alert_type] || selectedAlert.alert_type}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Severity</p>
                  <p className="text-slate-900 capitalize">{selectedAlert.severity}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Created</p>
                  <p className="text-slate-900">{format(new Date(selectedAlert.created_at), 'MMM d, yyyy h:mm a')}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <p className={selectedAlert.is_resolved ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                    {selectedAlert.is_resolved ? 'Resolved' : 'Active'}
                  </p>
                </div>
              </div>
              {selectedAlert.reference_type && (
                <div>
                  <p className="text-xs text-slate-500">Reference</p>
                  <p className="text-sm text-slate-700 capitalize">{selectedAlert.reference_type}</p>
                </div>
              )}
              {canManage && !selectedAlert.is_resolved && (
                <button onClick={() => handleResolve(selectedAlert)}
                  className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Resolve Alert
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
