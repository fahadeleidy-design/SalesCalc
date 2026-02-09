import { useState, useEffect } from 'react';
import { Briefcase, Search, Filter, ArrowUpDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigation } from '../contexts/NavigationContext';
import { formatCurrency } from '../lib/currencyUtils';
import { format } from 'date-fns';
import ProjectDetailPage from './ProjectDetailPage';

const statusColors: Record<string, string> = {
  in_progress: 'bg-blue-100 text-blue-700',
  pending_material: 'bg-amber-100 text-amber-700',
  in_production: 'bg-cyan-100 text-cyan-700',
  quality_check: 'bg-teal-100 text-teal-700',
  ready_to_ship: 'bg-green-100 text-green-700',
  on_hold: 'bg-slate-100 text-slate-600',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const statusOptions = ['all', 'in_progress', 'pending_material', 'in_production', 'quality_check', 'ready_to_ship', 'on_hold', 'completed', 'cancelled'];
const priorityOptions = ['all', 'low', 'normal', 'high', 'urgent'];

export default function ProjectsOverviewPage({ initialProjectId }: { initialProjectId?: string }) {
  const { navigate, navigationState } = useNavigation();
  const [projects, setProjects] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId || (navigationState as any)?.projectId || null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const [joRes, msRes, poRes] = await Promise.all([
      supabase.from('job_orders').select('*, customer:customers(company_name), quotation:quotations(quotation_number, total)').order('created_at', { ascending: false }),
      supabase.from('project_milestones').select('id, job_order_id, status'),
      supabase.from('purchase_orders').select('quotation_id, total, status').not('status', 'eq', 'cancelled'),
    ]);
    setProjects(joRes.data || []);
    setMilestones(msRes.data || []);
    setPos(poRes.data || []);
    setLoading(false);
  };

  if (selectedProjectId) {
    return <ProjectDetailPage projectId={selectedProjectId} />;
  }

  const quotationPoCosts = new Map<string, number>();
  pos.forEach((po: any) => {
    const c = quotationPoCosts.get(po.quotation_id) || 0;
    quotationPoCosts.set(po.quotation_id, c + Number(po.total || 0));
  });

  const filtered = projects.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && p.priority !== priorityFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return p.job_order_number?.toLowerCase().includes(s) || p.customer?.company_name?.toLowerCase().includes(s) || p.quotation?.quotation_number?.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500 mt-1">All job orders as project view</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search by job order, customer, or quotation..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
          {statusOptions.map(s => <option key={s} value={s}>{s === 'all' ? 'All Status' : s.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
          {priorityOptions.map(p => <option key={p} value={p}>{p === 'all' ? 'All Priority' : p}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-white rounded-lg animate-pulse" />)}</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-3 text-slate-600 font-medium">Job Order</th>
                  <th className="text-left p-3 text-slate-600 font-medium">Customer</th>
                  <th className="text-left p-3 text-slate-600 font-medium">Quotation</th>
                  <th className="text-right p-3 text-slate-600 font-medium">Value</th>
                  <th className="text-right p-3 text-slate-600 font-medium">PO Cost</th>
                  <th className="text-right p-3 text-slate-600 font-medium">Margin %</th>
                  <th className="text-center p-3 text-slate-600 font-medium">Priority</th>
                  <th className="text-center p-3 text-slate-600 font-medium">Status</th>
                  <th className="text-center p-3 text-slate-600 font-medium">Milestones</th>
                  <th className="text-center p-3 text-slate-600 font-medium">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={10} className="p-8 text-center text-slate-500">No projects found</td></tr>
                ) : filtered.map(project => {
                  const qTotal = Number(project.quotation?.total || 0);
                  const pCost = quotationPoCosts.get(project.quotation_id) || 0;
                  const marginPct = qTotal > 0 ? ((qTotal - pCost) / qTotal * 100).toFixed(1) : '-';
                  const joMs = milestones.filter((m: any) => m.job_order_id === project.id);
                  const completedMs = joMs.filter((m: any) => m.status === 'completed').length;
                  return (
                    <tr key={project.id} onClick={() => setSelectedProjectId(project.id)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                      <td className="p-3 font-semibold text-blue-600">{project.job_order_number}</td>
                      <td className="p-3 text-slate-700">{project.customer?.company_name || 'N/A'}</td>
                      <td className="p-3 text-slate-600">{project.quotation?.quotation_number || '-'}</td>
                      <td className="p-3 text-right text-slate-900">{formatCurrency(qTotal)}</td>
                      <td className="p-3 text-right text-slate-700">{formatCurrency(pCost)}</td>
                      <td className="p-3 text-right"><span className={Number(marginPct) > 20 ? 'text-emerald-600' : Number(marginPct) > 0 ? 'text-amber-600' : 'text-red-600'}>{marginPct}%</span></td>
                      <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[project.priority] || ''}`}>{project.priority}</span></td>
                      <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[project.status] || ''}`}>{project.status.replace(/_/g, ' ')}</span></td>
                      <td className="p-3 text-center text-slate-600">{joMs.length > 0 ? `${completedMs}/${joMs.length}` : '-'}</td>
                      <td className="p-3 text-center text-slate-500">{project.due_date ? format(new Date(project.due_date), 'MMM d, yy') : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
