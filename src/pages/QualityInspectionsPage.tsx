import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardCheck, Search, Filter, Plus, ChevronRight, X, Save,
  AlertTriangle, CheckCircle2, XCircle, Clock, FileText, ListChecks,
  Eye, Trash2, ToggleLeft, ToggleRight, ChevronDown, RefreshCw, Download
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Pagination, { usePagination } from '../components/ui/Pagination';
import QualityAnalyticsDashboard from '../components/quality/QualityAnalyticsDashboard';
import SupplierQualityRating from '../components/quality/SupplierQualityRating';
import CAPAManagementPanel from '../components/quality/CAPAManagementPanel';

type TabKey = 'inspections' | 'ncr' | 'templates' | 'capa' | 'analytics' | 'supplier_quality';

interface Inspection {
  id: string;
  inspection_number: string;
  inspection_type: string;
  reference_type: string;
  reference_id: string;
  product_id: string | null;
  quantity_inspected: number;
  quantity_passed: number;
  quantity_failed: number;
  result: string;
  checklist: any[];
  inspector_id: string | null;
  inspected_at: string | null;
  corrective_action: string | null;
  notes: string | null;
  created_at: string;
  product?: { name: string } | null;
  inspector?: { full_name: string } | null;
}

interface NCRReport {
  id: string;
  ncr_number: string;
  quality_inspection_id: string | null;
  severity: string;
  category: string;
  status: string;
  description: string;
  root_cause: string | null;
  corrective_action_plan: string | null;
  preventive_action_plan: string | null;
  assigned_to: string | null;
  due_date: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  cost_impact: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  inspection?: { inspection_number: string } | null;
  assignee?: { full_name: string } | null;
  creator?: { full_name: string } | null;
  actions?: NCRAction[];
}

interface NCRAction {
  id: string;
  ncr_report_id: string;
  action_type: string;
  description: string;
  assigned_to: string | null;
  due_date: string | null;
  status: string;
  completed_at: string | null;
  verified_by: string | null;
  verification_notes: string | null;
  assignee?: { full_name: string } | null;
}

interface InspectionTemplate {
  id: string;
  name: string;
  description: string | null;
  inspection_type: string;
  product_category: string | null;
  checklist_items: any[];
  is_active: boolean;
  created_at: string;
}

interface StaffMember {
  id: string;
  full_name: string;
}

const typeColors: Record<string, string> = {
  incoming: 'bg-blue-100 text-blue-700',
  in_process: 'bg-amber-100 text-amber-700',
  final: 'bg-emerald-100 text-emerald-700',
  return: 'bg-red-100 text-red-700',
};

const resultColors: Record<string, string> = {
  pass: 'bg-emerald-100 text-emerald-700',
  fail: 'bg-red-100 text-red-700',
  conditional: 'bg-amber-100 text-amber-700',
  pending: 'bg-slate-100 text-slate-600',
};

const severityColors: Record<string, string> = {
  minor: 'bg-amber-100 text-amber-700',
  major: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const ncrStatusColors: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  investigating: 'bg-amber-100 text-amber-700',
  corrective_action: 'bg-blue-100 text-blue-700',
  verification: 'bg-teal-100 text-teal-700',
  closed: 'bg-emerald-100 text-emerald-700',
  reopened: 'bg-orange-100 text-orange-700',
};

export default function QualityInspectionsPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('inspections');
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [ncrReports, setNCRReports] = useState<NCRReport[]>([]);
  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [ncrStatusFilter, setNCRStatusFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, passRate: 0, pending: 0, openNCRs: 0, criticalNCRs: 0 });

  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [selectedNCR, setSelectedNCR] = useState<NCRReport | null>(null);
  const [showNewInspection, setShowNewInspection] = useState(false);
  const [showNewNCR, setShowNewNCR] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editTemplate, setEditTemplate] = useState<InspectionTemplate | null>(null);
  const [prefillInspectionId, setPrefillInspectionId] = useState<string | null>(null);

  const canEdit = profile?.role && ['purchasing', 'engineering', 'project_manager', 'admin'].includes(profile.role);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [inspRes, ncrRes, templRes, staffRes, prodRes] = await Promise.all([
        supabase.from('quality_inspections').select('*, product:products(name), inspector:profiles!quality_inspections_inspector_id_fkey(full_name)').order('created_at', { ascending: false }),
        supabase.from('ncr_reports').select('*, inspection:quality_inspections(inspection_number), assignee:profiles!ncr_reports_assigned_to_fkey(full_name), creator:profiles!ncr_reports_created_by_fkey(full_name), actions:ncr_actions(*, assignee:profiles!ncr_actions_assigned_to_fkey(full_name))').order('created_at', { ascending: false }),
        supabase.from('inspection_templates').select('*').order('name'),
        supabase.from('profiles').select('id, full_name').order('full_name'),
        supabase.from('products').select('id, name').order('name'),
      ]);

      const allInsp = (inspRes.data || []) as Inspection[];
      const allNCR = (ncrRes.data || []) as NCRReport[];
      setInspections(allInsp);
      setNCRReports(allNCR);
      setTemplates((templRes.data || []) as InspectionTemplate[]);
      setStaff((staffRes.data || []) as StaffMember[]);
      setProducts((prodRes.data || []) as { id: string; name: string }[]);

      const completed = allInsp.filter(i => i.result !== 'pending');
      const passed = completed.filter(i => i.result === 'pass');
      const openNCRs = allNCR.filter(n => n.status !== 'closed');
      setStats({
        total: allInsp.length,
        passRate: completed.length > 0 ? Math.round((passed.length / completed.length) * 100) : 0,
        pending: allInsp.filter(i => i.result === 'pending').length,
        openNCRs: openNCRs.length,
        criticalNCRs: openNCRs.filter(n => n.severity === 'critical').length,
      });
    } catch (err) {
      console.error('Failed to load QC data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredInspections = inspections.filter(i => {
    if (typeFilter !== 'all' && i.inspection_type !== typeFilter) return false;
    if (resultFilter !== 'all' && i.result !== resultFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return i.inspection_number.toLowerCase().includes(s) ||
        i.product?.name?.toLowerCase().includes(s) ||
        i.reference_type.toLowerCase().includes(s);
    }
    return true;
  });

  const filteredNCR = ncrReports.filter(n => {
    if (severityFilter !== 'all' && n.severity !== severityFilter) return false;
    if (ncrStatusFilter !== 'all' && n.status !== ncrStatusFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return n.ncr_number.toLowerCase().includes(s) ||
        n.description.toLowerCase().includes(s) ||
        n.inspection?.inspection_number?.toLowerCase().includes(s);
    }
    return true;
  });

  const openNCRFromInspection = (inspId: string) => {
    setPrefillInspectionId(inspId);
    setShowNewNCR(true);
    setSelectedInspection(null);
  };

  const tabs: { key: TabKey; label: string; icon: any; count?: number }[] = [
    { key: 'inspections', label: 'Inspections', icon: ClipboardCheck, count: inspections.length },
    { key: 'ncr', label: 'NCR Reports', icon: AlertTriangle, count: ncrReports.filter(n => n.status !== 'closed').length },
    { key: 'templates', label: 'Templates', icon: ListChecks, count: templates.length },
    { key: 'capa', label: 'CAPA', icon: FileText },
    { key: 'analytics', label: 'Analytics', icon: RefreshCw },
    { key: 'supplier_quality', label: 'Supplier Quality', icon: Eye },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}
        </div>
        <div className="h-96 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quality Control</h1>
          <p className="text-sm text-slate-500 mt-1">Inspections, non-conformance reports, and templates</p>
        </div>
        <button onClick={loadData} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard label="Total Inspections" value={stats.total} icon={ClipboardCheck} color="blue" />
        <KPICard label="Pass Rate" value={`${stats.passRate}%`} icon={CheckCircle2} color="emerald" />
        <KPICard label="Pending Review" value={stats.pending} icon={Clock} color="amber" />
        <KPICard label="Open NCRs" value={stats.openNCRs} icon={AlertTriangle} color={stats.openNCRs > 0 ? 'red' : 'slate'} />
        <KPICard label="Critical NCRs" value={stats.criticalNCRs} icon={XCircle} color={stats.criticalNCRs > 0 ? 'red' : 'slate'} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center gap-1 border-b border-slate-200 px-4">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearchTerm(''); }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                  activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'inspections' && (
          <InspectionsTab
            inspections={filteredInspections}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            resultFilter={resultFilter}
            setResultFilter={setResultFilter}
            onSelect={setSelectedInspection}
            onNew={() => setShowNewInspection(true)}
            canEdit={!!canEdit}
          />
        )}

        {activeTab === 'ncr' && (
          <NCRTab
            ncrReports={filteredNCR}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            severityFilter={severityFilter}
            setSeverityFilter={setSeverityFilter}
            statusFilter={ncrStatusFilter}
            setStatusFilter={setNCRStatusFilter}
            onSelect={setSelectedNCR}
            onNew={() => { setPrefillInspectionId(null); setShowNewNCR(true); }}
            canEdit={!!canEdit}
          />
        )}

        {activeTab === 'templates' && (
          <TemplatesTab
            templates={templates}
            onNew={() => { setEditTemplate(null); setShowTemplateForm(true); }}
            onEdit={(t) => { setEditTemplate(t); setShowTemplateForm(true); }}
            onToggle={async (t) => {
              await supabase.from('inspection_templates').update({ is_active: !t.is_active }).eq('id', t.id);
              loadData();
            }}
            canEdit={!!canEdit}
          />
        )}

        {activeTab === 'capa' && (
          <div className="p-6">
            <CAPAManagementPanel />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="p-6">
            <QualityAnalyticsDashboard />
          </div>
        )}

        {activeTab === 'supplier_quality' && (
          <div className="p-6">
            <SupplierQualityRating />
          </div>
        )}
      </div>

      {selectedInspection && (
        <InspectionDetail
          inspection={selectedInspection}
          onClose={() => setSelectedInspection(null)}
          onCreateNCR={openNCRFromInspection}
          canEdit={!!canEdit}
        />
      )}

      {selectedNCR && (
        <NCRDetail
          ncr={selectedNCR}
          staff={staff}
          onClose={() => setSelectedNCR(null)}
          onRefresh={loadData}
          canEdit={!!canEdit}
        />
      )}

      {showNewInspection && (
        <NewInspectionModal
          products={products}
          templates={templates}
          onClose={() => setShowNewInspection(false)}
          onSaved={() => { setShowNewInspection(false); loadData(); }}
        />
      )}

      {showNewNCR && (
        <NewNCRModal
          inspections={inspections}
          staff={staff}
          prefillInspectionId={prefillInspectionId}
          onClose={() => { setShowNewNCR(false); setPrefillInspectionId(null); }}
          onSaved={() => { setShowNewNCR(false); setPrefillInspectionId(null); loadData(); }}
        />
      )}

      {showTemplateForm && (
        <TemplateFormModal
          template={editTemplate}
          onClose={() => { setShowTemplateForm(false); setEditTemplate(null); }}
          onSaved={() => { setShowTemplateForm(false); setEditTemplate(null); loadData(); }}
        />
      )}
    </div>
  );
}

function KPICard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  const colorMap: Record<string, { bg: string; text: string; value: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', value: 'text-blue-900' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', value: 'text-emerald-900' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', value: 'text-amber-900' },
    red: { bg: 'bg-red-50', text: 'text-red-600', value: 'text-red-900' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-500', value: 'text-slate-900' },
  };
  const c = colorMap[color] || colorMap.slate;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${c.bg}`}><Icon className={`w-4 h-4 ${c.text}`} /></div>
        <div>
          <p className="text-[11px] text-slate-500 font-medium">{label}</p>
          <p className={`text-xl font-bold ${c.value}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function InspectionsTab({ inspections, searchTerm, setSearchTerm, typeFilter, setTypeFilter, resultFilter, setResultFilter, onSelect, onNew, canEdit }: any) {
  const [currentPage, setCurrentPage] = useState(1);
  const { totalItems, totalPages, pageSize, getPageItems } = usePagination(inspections, 25);
  const pageItems = getPageItems(currentPage);

  const exportCSV = () => {
    const rows = [['Number', 'Type', 'Product', 'Reference', 'Qty Inspected', 'Passed', 'Failed', 'Result', 'Inspector', 'Date']];
    inspections.forEach((i: Inspection) => {
      rows.push([
        i.inspection_number, i.inspection_type, i.product?.name || '', i.reference_type,
        String(i.quantity_inspected), String(i.quantity_passed), String(i.quantity_failed),
        i.result, i.inspector?.full_name || '', format(new Date(i.created_at), 'yyyy-MM-dd'),
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `inspections_${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="p-4 flex flex-wrap items-center gap-3 border-b border-slate-100">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search inspections..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }} className="text-sm border border-slate-200 rounded-lg px-3 py-2">
          <option value="all">All Types</option>
          <option value="incoming">Incoming</option>
          <option value="in_process">In-Process</option>
          <option value="final">Final</option>
          <option value="return">Return</option>
        </select>
        <select value={resultFilter} onChange={e => { setResultFilter(e.target.value); setCurrentPage(1); }} className="text-sm border border-slate-200 rounded-lg px-3 py-2">
          <option value="all">All Results</option>
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
          <option value="conditional">Conditional</option>
          <option value="pending">Pending</option>
        </select>
        <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
          <Download className="w-4 h-4" /> Export
        </button>
        {canEdit && (
          <button onClick={onNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Inspection
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className="px-4 py-3 font-medium text-slate-500">Number</th>
              <th className="px-4 py-3 font-medium text-slate-500">Type</th>
              <th className="px-4 py-3 font-medium text-slate-500">Product</th>
              <th className="px-4 py-3 font-medium text-slate-500">Reference</th>
              <th className="px-4 py-3 font-medium text-slate-500 text-center">Qty</th>
              <th className="px-4 py-3 font-medium text-slate-500 text-center">Passed</th>
              <th className="px-4 py-3 font-medium text-slate-500 text-center">Failed</th>
              <th className="px-4 py-3 font-medium text-slate-500">Result</th>
              <th className="px-4 py-3 font-medium text-slate-500">Inspector</th>
              <th className="px-4 py-3 font-medium text-slate-500">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {pageItems.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">No inspections found</td></tr>
            ) : pageItems.map((insp: Inspection) => (
              <tr key={insp.id} onClick={() => onSelect(insp)} className="hover:bg-slate-50 cursor-pointer">
                <td className="px-4 py-3 font-medium text-slate-900">{insp.inspection_number}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${typeColors[insp.inspection_type] || 'bg-slate-100 text-slate-600'}`}>
                    {insp.inspection_type.replace('_', '-')}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{insp.product?.name || '-'}</td>
                <td className="px-4 py-3 text-slate-500 capitalize">{insp.reference_type.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-center text-slate-700">{insp.quantity_inspected}</td>
                <td className="px-4 py-3 text-center text-emerald-600 font-medium">{insp.quantity_passed}</td>
                <td className="px-4 py-3 text-center text-red-600 font-medium">{insp.quantity_failed}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${resultColors[insp.result] || 'bg-slate-100 text-slate-600'}`}>
                    {insp.result}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{insp.inspector?.full_name || '-'}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{format(new Date(insp.created_at), 'MMM d, yyyy')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setCurrentPage} />
    </div>
  );
}

function NCRTab({ ncrReports, searchTerm, setSearchTerm, severityFilter, setSeverityFilter, statusFilter, setStatusFilter, onSelect, onNew, canEdit }: any) {
  const [currentPage, setCurrentPage] = useState(1);
  const { totalItems, totalPages, pageSize, getPageItems } = usePagination(ncrReports, 25);
  const pageItems = getPageItems(currentPage);

  return (
    <div>
      <div className="p-4 flex flex-wrap items-center gap-3 border-b border-slate-100">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search NCRs..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <select value={severityFilter} onChange={e => { setSeverityFilter(e.target.value); setCurrentPage(1); }} className="text-sm border border-slate-200 rounded-lg px-3 py-2">
          <option value="all">All Severity</option>
          <option value="minor">Minor</option>
          <option value="major">Major</option>
          <option value="critical">Critical</option>
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="text-sm border border-slate-200 rounded-lg px-3 py-2">
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="corrective_action">Corrective Action</option>
          <option value="verification">Verification</option>
          <option value="closed">Closed</option>
          <option value="reopened">Reopened</option>
        </select>
        {canEdit && (
          <button onClick={onNew} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">
            <Plus className="w-4 h-4" /> New NCR
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className="px-4 py-3 font-medium text-slate-500">NCR #</th>
              <th className="px-4 py-3 font-medium text-slate-500">Inspection</th>
              <th className="px-4 py-3 font-medium text-slate-500">Severity</th>
              <th className="px-4 py-3 font-medium text-slate-500">Category</th>
              <th className="px-4 py-3 font-medium text-slate-500">Description</th>
              <th className="px-4 py-3 font-medium text-slate-500">Assigned To</th>
              <th className="px-4 py-3 font-medium text-slate-500">Due Date</th>
              <th className="px-4 py-3 font-medium text-slate-500">Status</th>
              <th className="px-4 py-3 font-medium text-slate-500">Age</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {pageItems.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">No NCR reports found</td></tr>
            ) : pageItems.map((ncr: NCRReport) => {
              const age = Math.floor((Date.now() - new Date(ncr.created_at).getTime()) / (1000 * 60 * 60 * 24));
              return (
                <tr key={ncr.id} onClick={() => onSelect(ncr)} className="hover:bg-slate-50 cursor-pointer">
                  <td className="px-4 py-3 font-medium text-slate-900">{ncr.ncr_number}</td>
                  <td className="px-4 py-3 text-slate-500">{ncr.inspection?.inspection_number || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${severityColors[ncr.severity]}`}>{ncr.severity}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{ncr.category}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">{ncr.description}</td>
                  <td className="px-4 py-3 text-slate-500">{ncr.assignee?.full_name || '-'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{ncr.due_date ? format(new Date(ncr.due_date), 'MMM d, yyyy') : '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ncrStatusColors[ncr.status]}`}>
                      {ncr.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{age}d</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setCurrentPage} />
    </div>
  );
}

function TemplatesTab({ templates, onNew, onEdit, onToggle, canEdit }: any) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{templates.length} templates</p>
        {canEdit && (
          <button onClick={onNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Template
          </button>
        )}
      </div>
      {templates.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No templates yet</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t: InspectionTemplate) => (
            <div key={t.id} className={`border rounded-xl p-4 transition-colors ${t.is_active ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-slate-900">{t.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${typeColors[t.inspection_type] || 'bg-slate-100 text-slate-600'}`}>
                    {t.inspection_type.replace('_', '-')}
                  </span>
                </div>
                {canEdit && (
                  <button onClick={() => onToggle(t)} className="text-slate-400 hover:text-slate-600">
                    {t.is_active ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                )}
              </div>
              {t.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</p>}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-400">{t.checklist_items?.length || 0} items</span>
                {canEdit && (
                  <button onClick={() => onEdit(t)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Edit</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InspectionDetail({ inspection, onClose, onCreateNCR, canEdit }: { inspection: Inspection; onClose: () => void; onCreateNCR: (id: string) => void; canEdit: boolean }) {
  const checklist = Array.isArray(inspection.checklist) ? inspection.checklist : [];
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-slate-900">{inspection.inspection_number}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${typeColors[inspection.inspection_type]}`}>
                {inspection.inspection_type.replace('_', '-')}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${resultColors[inspection.result]}`}>
                {inspection.result}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500">Product</span><p className="font-medium">{inspection.product?.name || '-'}</p></div>
            <div><span className="text-slate-500">Reference</span><p className="font-medium capitalize">{inspection.reference_type.replace('_', ' ')}</p></div>
            <div><span className="text-slate-500">Inspector</span><p className="font-medium">{inspection.inspector?.full_name || '-'}</p></div>
            <div><span className="text-slate-500">Date</span><p className="font-medium">{inspection.inspected_at ? format(new Date(inspection.inspected_at), 'MMM d, yyyy') : format(new Date(inspection.created_at), 'MMM d, yyyy')}</p></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-blue-900">{inspection.quantity_inspected}</p>
              <p className="text-[10px] text-blue-600">Inspected</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-emerald-900">{inspection.quantity_passed}</p>
              <p className="text-[10px] text-emerald-600">Passed</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-red-900">{inspection.quantity_failed}</p>
              <p className="text-[10px] text-red-600">Failed</p>
            </div>
          </div>
          {checklist.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Checklist</h3>
              <div className="space-y-2">
                {checklist.map((item: any, i: number) => (
                  <div key={i} className={`flex items-start gap-3 p-2.5 rounded-lg ${item.passed ? 'bg-emerald-50' : item.passed === false ? 'bg-red-50' : 'bg-slate-50'}`}>
                    {item.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> :
                     item.passed === false ? <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" /> :
                     <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{item.name || item.item}</p>
                      {item.criteria && <p className="text-xs text-slate-500 mt-0.5">{item.criteria}</p>}
                      {item.notes && <p className="text-xs text-slate-400 mt-0.5 italic">{item.notes}</p>}
                    </div>
                    {item.required && <span className="text-[9px] text-red-500 font-medium">REQ</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {inspection.corrective_action && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Corrective Action</h3>
              <p className="text-sm text-slate-600">{inspection.corrective_action}</p>
            </div>
          )}
          {inspection.notes && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Notes</h3>
              <p className="text-sm text-slate-600">{inspection.notes}</p>
            </div>
          )}
          {inspection.result === 'fail' && canEdit && (
            <button
              onClick={() => onCreateNCR(inspection.id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700"
            >
              <AlertTriangle className="w-4 h-4" /> Create Non-Conformance Report
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function NCRDetail({ ncr, staff, onClose, onRefresh, canEdit }: { ncr: NCRReport; staff: StaffMember[]; onClose: () => void; onRefresh: () => void; canEdit: boolean }) {
  const [saving, setSaving] = useState(false);
  const [newAction, setNewAction] = useState({ action_type: 'corrective', description: '', assigned_to: '', due_date: '' });
  const [showAddAction, setShowAddAction] = useState(false);

  const updateStatus = async (newStatus: string) => {
    setSaving(true);
    const updates: any = { status: newStatus };
    if (newStatus === 'closed') {
      updates.resolved_at = new Date().toISOString();
    }
    const { error } = await supabase.from('ncr_reports').update(updates).eq('id', ncr.id);
    if (error) toast.error('Failed to update status');
    else { toast.success('Status updated'); onRefresh(); onClose(); }
    setSaving(false);
  };

  const addAction = async () => {
    if (!newAction.description.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('ncr_actions').insert({
      ncr_report_id: ncr.id,
      action_type: newAction.action_type,
      description: newAction.description,
      assigned_to: newAction.assigned_to || null,
      due_date: newAction.due_date || null,
    });
    if (error) toast.error('Failed to add action');
    else { toast.success('Action added'); setNewAction({ action_type: 'corrective', description: '', assigned_to: '', due_date: '' }); setShowAddAction(false); onRefresh(); onClose(); }
    setSaving(false);
  };

  const completeAction = async (actionId: string) => {
    await supabase.from('ncr_actions').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', actionId);
    toast.success('Action completed');
    onRefresh();
    onClose();
  };

  const statusFlow: Record<string, { label: string; next: string }[]> = {
    open: [{ label: 'Start Investigation', next: 'investigating' }],
    investigating: [{ label: 'Plan Corrective Action', next: 'corrective_action' }],
    corrective_action: [{ label: 'Send for Verification', next: 'verification' }],
    verification: [{ label: 'Close NCR', next: 'closed' }, { label: 'Reopen', next: 'reopened' }],
    closed: [{ label: 'Reopen', next: 'reopened' }],
    reopened: [{ label: 'Start Investigation', next: 'investigating' }],
  };

  const actions = ncr.actions || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-slate-900">{ncr.ncr_number}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${severityColors[ncr.severity]}`}>{ncr.severity}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ncrStatusColors[ncr.status]}`}>{ncr.status.replace('_', ' ')}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-500">Category</span><p className="font-medium capitalize">{ncr.category}</p></div>
            <div><span className="text-slate-500">Inspection</span><p className="font-medium">{ncr.inspection?.inspection_number || '-'}</p></div>
            <div><span className="text-slate-500">Assigned To</span><p className="font-medium">{ncr.assignee?.full_name || '-'}</p></div>
            <div><span className="text-slate-500">Due Date</span><p className="font-medium">{ncr.due_date ? format(new Date(ncr.due_date), 'MMM d, yyyy') : '-'}</p></div>
            <div><span className="text-slate-500">Cost Impact</span><p className="font-medium">{Number(ncr.cost_impact) > 0 ? `$${Number(ncr.cost_impact).toLocaleString()}` : '-'}</p></div>
            <div><span className="text-slate-500">Created By</span><p className="font-medium">{ncr.creator?.full_name || '-'}</p></div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Description</h3>
            <p className="text-sm text-slate-600">{ncr.description}</p>
          </div>

          {ncr.root_cause && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Root Cause</h3>
              <p className="text-sm text-slate-600">{ncr.root_cause}</p>
            </div>
          )}

          {ncr.corrective_action_plan && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Corrective Action Plan</h3>
              <p className="text-sm text-slate-600">{ncr.corrective_action_plan}</p>
            </div>
          )}

          {ncr.preventive_action_plan && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Preventive Action Plan</h3>
              <p className="text-sm text-slate-600">{ncr.preventive_action_plan}</p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-900">Action Items ({actions.length})</h3>
              {canEdit && (
                <button onClick={() => setShowAddAction(!showAddAction)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  {showAddAction ? 'Cancel' : '+ Add Action'}
                </button>
              )}
            </div>
            {showAddAction && (
              <div className="bg-slate-50 rounded-lg p-3 mb-3 space-y-2">
                <select value={newAction.action_type} onChange={e => setNewAction({ ...newAction, action_type: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2">
                  <option value="containment">Containment</option>
                  <option value="corrective">Corrective</option>
                  <option value="preventive">Preventive</option>
                </select>
                <textarea value={newAction.description} onChange={e => setNewAction({ ...newAction, description: e.target.value })} placeholder="Action description..." rows={2} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
                <div className="grid grid-cols-2 gap-2">
                  <select value={newAction.assigned_to} onChange={e => setNewAction({ ...newAction, assigned_to: e.target.value })} className="text-sm border border-slate-200 rounded-lg px-3 py-2">
                    <option value="">Assign to...</option>
                    {staff.map((s: StaffMember) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                  <input type="date" value={newAction.due_date} onChange={e => setNewAction({ ...newAction, due_date: e.target.value })} className="text-sm border border-slate-200 rounded-lg px-3 py-2" />
                </div>
                <button onClick={addAction} disabled={saving || !newAction.description.trim()} className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  Add Action
                </button>
              </div>
            )}
            <div className="space-y-2">
              {actions.map((action: NCRAction) => {
                const actionTypeColors: Record<string, string> = { containment: 'bg-orange-100 text-orange-700', corrective: 'bg-blue-100 text-blue-700', preventive: 'bg-teal-100 text-teal-700' };
                const actionStatusColors: Record<string, string> = { pending: 'text-slate-500', in_progress: 'text-blue-600', completed: 'text-emerald-600', overdue: 'text-red-600' };
                return (
                  <div key={action.id} className={`border rounded-lg p-3 ${action.status === 'completed' ? 'bg-emerald-50 border-emerald-200' : 'border-slate-200'}`}>
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${actionTypeColors[action.action_type]}`}>{action.action_type}</span>
                        <span className={`text-xs font-medium capitalize ${actionStatusColors[action.status]}`}>{action.status}</span>
                      </div>
                      {canEdit && action.status !== 'completed' && (
                        <button onClick={() => completeAction(action.id)} className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium">Complete</button>
                      )}
                    </div>
                    <p className="text-sm text-slate-700">{action.description}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                      {action.assignee?.full_name && <span>{action.assignee.full_name}</span>}
                      {action.due_date && <span>Due: {format(new Date(action.due_date), 'MMM d')}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {ncr.resolution_notes && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Resolution Notes</h3>
              <p className="text-sm text-slate-600">{ncr.resolution_notes}</p>
            </div>
          )}

          {canEdit && (statusFlow[ncr.status] || []).length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
              {(statusFlow[ncr.status] || []).map(t => (
                <button key={t.next} onClick={() => updateStatus(t.next)} disabled={saving}
                  className={`px-4 py-2 text-sm font-medium rounded-lg ${
                    t.next === 'closed' ? 'bg-emerald-600 text-white hover:bg-emerald-700' :
                    t.next === 'reopened' ? 'bg-orange-600 text-white hover:bg-orange-700' :
                    'bg-blue-600 text-white hover:bg-blue-700'
                  } disabled:opacity-50`}>
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NewInspectionModal({ products, templates, onClose, onSaved }: { products: { id: string; name: string }[]; templates: InspectionTemplate[]; onClose: () => void; onSaved: () => void }) {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    inspection_type: 'final',
    reference_type: 'job_order',
    reference_id: '',
    product_id: '',
    quantity_inspected: 0,
    quantity_passed: 0,
    quantity_failed: 0,
    result: 'pending',
    corrective_action: '',
    notes: '',
  });
  const [checklist, setChecklist] = useState<{ name: string; criteria: string; required: boolean; passed: boolean | null; notes: string }[]>([]);

  const addChecklistItem = () => {
    setChecklist([...checklist, { name: '', criteria: '', required: false, passed: null, notes: '' }]);
  };

  const removeChecklistItem = (idx: number) => {
    setChecklist(checklist.filter((_, i) => i !== idx));
  };

  const updateChecklistItem = (idx: number, field: string, value: any) => {
    const updated = [...checklist];
    (updated[idx] as any)[field] = value;
    setChecklist(updated);
  };

  const loadTemplate = (templateId: string) => {
    const tpl = templates.find(t => t.id === templateId);
    if (tpl?.checklist_items) {
      setChecklist(tpl.checklist_items.map((item: any) => ({
        name: item.name || '',
        criteria: item.criteria || '',
        required: item.required || false,
        passed: null,
        notes: '',
      })));
    }
  };

  const autoResult = () => {
    if (form.quantity_failed > 0) return 'fail';
    const hasRequiredFail = checklist.some(c => c.required && c.passed === false);
    if (hasRequiredFail) return 'fail';
    if (checklist.length > 0 && checklist.every(c => c.passed === true) && form.quantity_inspected > 0 && form.quantity_failed === 0) return 'pass';
    return 'pending';
  };

  const handleSave = async () => {
    if (!form.reference_id.trim()) { toast.error('Reference ID is required'); return; }
    if (form.quantity_inspected <= 0) { toast.error('Quantity inspected must be > 0'); return; }
    setSaving(true);
    const inspNum = 'QI-' + Date.now().toString().slice(-8);
    const result = form.result === 'pending' ? autoResult() : form.result;
    const { error } = await supabase.from('quality_inspections').insert({
      inspection_number: inspNum,
      inspection_type: form.inspection_type,
      reference_type: form.reference_type,
      reference_id: form.reference_id,
      product_id: form.product_id || null,
      quantity_inspected: form.quantity_inspected,
      quantity_passed: form.quantity_passed,
      quantity_failed: form.quantity_failed,
      result,
      checklist,
      inspector_id: profile?.id,
      inspected_at: new Date().toISOString(),
      corrective_action: form.corrective_action || null,
      notes: form.notes || null,
    });
    if (error) { toast.error('Failed to save inspection'); console.error(error); }
    else { toast.success('Inspection saved'); onSaved(); }
    setSaving(false);
  };

  const activeTemplates = templates.filter(t => t.is_active && t.inspection_type === form.inspection_type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-slate-900">New Quality Inspection</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select value={form.inspection_type} onChange={e => setForm({ ...form, inspection_type: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2">
                <option value="incoming">Incoming</option>
                <option value="in_process">In-Process</option>
                <option value="final">Final</option>
                <option value="return">Return</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Load Template</label>
              <select onChange={e => e.target.value && loadTemplate(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2">
                <option value="">Select template...</option>
                {activeTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reference Type</label>
              <select value={form.reference_type} onChange={e => setForm({ ...form, reference_type: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2">
                <option value="job_order">Job Order</option>
                <option value="goods_receipt">Goods Receipt</option>
                <option value="stock_movement">Stock Movement</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reference ID</label>
              <input type="text" value={form.reference_id} onChange={e => setForm({ ...form, reference_id: e.target.value })} placeholder="Enter reference UUID" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Product</label>
            <select value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2">
              <option value="">Select product...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Qty Inspected</label>
              <input type="number" min={0} value={form.quantity_inspected} onChange={e => {
                const v = parseInt(e.target.value) || 0;
                setForm({ ...form, quantity_inspected: v, quantity_failed: Math.max(0, v - form.quantity_passed) });
              }} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Qty Passed</label>
              <input type="number" min={0} value={form.quantity_passed} onChange={e => {
                const v = parseInt(e.target.value) || 0;
                setForm({ ...form, quantity_passed: v, quantity_failed: Math.max(0, form.quantity_inspected - v) });
              }} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Qty Failed</label>
              <input type="number" min={0} value={form.quantity_failed} readOnly className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Result</label>
            <select value={form.result} onChange={e => setForm({ ...form, result: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2">
              <option value="pending">Auto-determine</option>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="conditional">Conditional</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Checklist Items</label>
              <button onClick={addChecklistItem} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Item</button>
            </div>
            {checklist.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No checklist items. Add items or load a template.</p>
            ) : (
              <div className="space-y-2">
                {checklist.map((item, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <input type="text" value={item.name} onChange={e => updateChecklistItem(idx, 'name', e.target.value)} placeholder="Item name" className="flex-1 text-sm border border-slate-200 rounded px-2 py-1" />
                      <button onClick={() => removeChecklistItem(idx)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <input type="text" value={item.criteria} onChange={e => updateChecklistItem(idx, 'criteria', e.target.value)} placeholder="Acceptance criteria" className="w-full text-xs border border-slate-200 rounded px-2 py-1 mb-2" />
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 text-xs">
                        <input type="checkbox" checked={item.required} onChange={e => updateChecklistItem(idx, 'required', e.target.checked)} className="rounded" />
                        Required
                      </label>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateChecklistItem(idx, 'passed', item.passed === true ? null : true)}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium ${item.passed === true ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>Pass</button>
                        <button onClick={() => updateChecklistItem(idx, 'passed', item.passed === false ? null : false)}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium ${item.passed === false ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>Fail</button>
                      </div>
                      <input type="text" value={item.notes} onChange={e => updateChecklistItem(idx, 'notes', e.target.value)} placeholder="Notes..." className="flex-1 text-xs border border-slate-200 rounded px-2 py-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Corrective Action</label>
            <textarea value={form.corrective_action} onChange={e => setForm({ ...form, corrective_action: e.target.value })} rows={2} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <Save className="w-4 h-4 inline mr-1" /> Save Inspection
          </button>
        </div>
      </div>
    </div>
  );
}

function NewNCRModal({ inspections, staff, prefillInspectionId, onClose, onSaved }: { inspections: Inspection[]; staff: StaffMember[]; prefillInspectionId: string | null; onClose: () => void; onSaved: () => void }) {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const failedInspections = inspections.filter(i => i.result === 'fail');
  const [form, setForm] = useState({
    quality_inspection_id: prefillInspectionId || '',
    severity: 'minor',
    category: 'functional',
    description: '',
    root_cause: '',
    assigned_to: '',
    due_date: '',
    cost_impact: 0,
  });

  const handleSave = async () => {
    if (!form.description.trim()) { toast.error('Description is required'); return; }
    setSaving(true);
    const { error } = await supabase.from('ncr_reports').insert({
      quality_inspection_id: form.quality_inspection_id || null,
      severity: form.severity,
      category: form.category,
      description: form.description,
      root_cause: form.root_cause || null,
      assigned_to: form.assigned_to || null,
      due_date: form.due_date || null,
      cost_impact: form.cost_impact,
      created_by: profile?.id,
    });
    if (error) { toast.error('Failed to create NCR'); console.error(error); }
    else { toast.success('NCR created'); onSaved(); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-slate-900">New NCR Report</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Linked Inspection</label>
            <select value={form.quality_inspection_id} onChange={e => setForm({ ...form, quality_inspection_id: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2">
              <option value="">None</option>
              {failedInspections.map(i => <option key={i.id} value={i.id}>{i.inspection_number} - {i.product?.name || 'Unknown'}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Severity</label>
              <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2">
                <option value="minor">Minor</option>
                <option value="major">Major</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2">
                <option value="dimensional">Dimensional</option>
                <option value="cosmetic">Cosmetic</option>
                <option value="functional">Functional</option>
                <option value="material">Material</option>
                <option value="documentation">Documentation</option>
                <option value="packaging">Packaging</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" placeholder="Describe the non-conformance..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Root Cause (optional)</label>
            <textarea value={form.root_cause} onChange={e => setForm({ ...form, root_cause: e.target.value })} rows={2} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" placeholder="Initial root cause analysis..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Assign To</label>
              <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2">
                <option value="">Select person...</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cost Impact</label>
            <input type="number" min={0} value={form.cost_impact} onChange={e => setForm({ ...form, cost_impact: parseFloat(e.target.value) || 0 })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
            Create NCR
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplateFormModal({ template, onClose, onSaved }: { template: InspectionTemplate | null; onClose: () => void; onSaved: () => void }) {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: template?.name || '',
    description: template?.description || '',
    inspection_type: template?.inspection_type || 'final',
    product_category: template?.product_category || '',
  });
  const [items, setItems] = useState<{ name: string; criteria: string; required: boolean }[]>(
    template?.checklist_items?.map((i: any) => ({ name: i.name || '', criteria: i.criteria || '', required: i.required || false })) || []
  );

  const addItem = () => setItems([...items, { name: '', criteria: '', required: false }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Template name is required'); return; }
    if (items.length === 0) { toast.error('Add at least one checklist item'); return; }
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description || null,
      inspection_type: form.inspection_type,
      product_category: form.product_category || null,
      checklist_items: items,
      created_by: profile?.id,
    };
    const { error } = template
      ? await supabase.from('inspection_templates').update(payload).eq('id', template.id)
      : await supabase.from('inspection_templates').insert(payload);
    if (error) { toast.error('Failed to save template'); console.error(error); }
    else { toast.success(template ? 'Template updated' : 'Template created'); onSaved(); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-slate-900">{template ? 'Edit' : 'New'} Template</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select value={form.inspection_type} onChange={e => setForm({ ...form, inspection_type: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2">
                <option value="incoming">Incoming</option>
                <option value="in_process">In-Process</option>
                <option value="final">Final</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Product Category</label>
              <input type="text" value={form.product_category} onChange={e => setForm({ ...form, product_category: e.target.value })} placeholder="Optional" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Checklist Items</label>
              <button onClick={addItem} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Item</button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input type="text" value={item.name} onChange={e => { const u = [...items]; u[idx] = { ...u[idx], name: e.target.value }; setItems(u); }} placeholder="Item name" className="flex-1 text-sm border border-slate-200 rounded px-2 py-1.5" />
                  <input type="text" value={item.criteria} onChange={e => { const u = [...items]; u[idx] = { ...u[idx], criteria: e.target.value }; setItems(u); }} placeholder="Criteria" className="flex-1 text-sm border border-slate-200 rounded px-2 py-1.5" />
                  <label className="flex items-center gap-1 text-xs shrink-0">
                    <input type="checkbox" checked={item.required} onChange={e => { const u = [...items]; u[idx] = { ...u[idx], required: e.target.checked }; setItems(u); }} className="rounded" />
                    Req
                  </label>
                  <button onClick={() => removeItem(idx)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {template ? 'Update' : 'Create'} Template
          </button>
        </div>
      </div>
    </div>
  );
}
