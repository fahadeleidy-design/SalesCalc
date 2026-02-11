import { useState, useEffect, useMemo } from 'react';
import {
  Users, Clock, BarChart3, AlertTriangle, CheckCircle,
  TrendingUp, Calendar, Search, ChevronDown, ChevronUp,
  Briefcase, Activity
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { supabase } from '../lib/supabase';
import { format, differenceInWeeks, parseISO, isWithinInterval } from 'date-fns';

interface ResourceAllocation {
  id: string;
  job_order_id: string;
  user_id: string;
  role: string;
  allocated_hours_per_week: number;
  start_date: string;
  end_date: string | null;
  job_orders?: { job_order_number: string; status: string; health_status: string };
  profiles?: { full_name: string; role: string };
}

interface TimesheetSummary {
  user_id: string;
  total_approved_hours: number;
  total_submitted_hours: number;
}

interface ResourceView {
  userId: string;
  name: string;
  role: string;
  allocations: ResourceAllocation[];
  totalAllocatedHoursPerWeek: number;
  actualHoursThisMonth: number;
  projectCount: number;
  utilizationPct: number;
}

export default function ResourceUtilizationPage() {
  const [allocations, setAllocations] = useState<ResourceAllocation[]>([]);
  const [timesheetSummaries, setTimesheetSummaries] = useState<TimesheetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [expandedResource, setExpandedResource] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const now = new Date();
      const monthStart = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
      const monthEnd = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');

      const [allocRes, tsRes] = await Promise.all([
        supabase.from('project_resource_allocations')
          .select('*, job_orders(job_order_number, status, health_status), profiles!project_resource_allocations_user_id_fkey(full_name, role)')
          .order('start_date'),
        supabase.from('project_timesheets')
          .select('user_id, hours_worked, status')
          .gte('work_date', monthStart)
          .lte('work_date', monthEnd)
          .in('status', ['approved', 'submitted']),
      ]);

      setAllocations(allocRes.data || []);

      const summaryMap = new Map<string, TimesheetSummary>();
      (tsRes.data || []).forEach((ts: any) => {
        const existing = summaryMap.get(ts.user_id) || { user_id: ts.user_id, total_approved_hours: 0, total_submitted_hours: 0 };
        if (ts.status === 'approved') existing.total_approved_hours += ts.hours_worked;
        if (ts.status === 'submitted') existing.total_submitted_hours += ts.hours_worked;
        summaryMap.set(ts.user_id, existing);
      });
      setTimesheetSummaries(Array.from(summaryMap.values()));
    } catch (err) {
      console.error('Failed to load resource data:', err);
    } finally {
      setLoading(false);
    }
  };

  const resources = useMemo(() => {
    const map = new Map<string, ResourceView>();
    const now = new Date();

    allocations.forEach(alloc => {
      if (!alloc.profiles) return;
      const allocEnd = alloc.end_date ? new Date(alloc.end_date) : null;
      const isActive = !allocEnd || allocEnd >= now;

      const existing = map.get(alloc.user_id) || {
        userId: alloc.user_id,
        name: alloc.profiles.full_name,
        role: alloc.profiles.role,
        allocations: [],
        totalAllocatedHoursPerWeek: 0,
        actualHoursThisMonth: 0,
        projectCount: 0,
        utilizationPct: 0,
      };

      existing.allocations.push(alloc);
      if (isActive) {
        existing.totalAllocatedHoursPerWeek += alloc.allocated_hours_per_week;
      }

      map.set(alloc.user_id, existing);
    });

    const projectCounts = new Map<string, Set<string>>();
    allocations.forEach(a => {
      const set = projectCounts.get(a.user_id) || new Set();
      set.add(a.job_order_id);
      projectCounts.set(a.user_id, set);
    });

    map.forEach((resource, userId) => {
      resource.projectCount = projectCounts.get(userId)?.size || 0;
      const tsData = timesheetSummaries.find(t => t.user_id === userId);
      resource.actualHoursThisMonth = tsData ? tsData.total_approved_hours + tsData.total_submitted_hours : 0;
      const maxWeeklyCapacity = 40;
      resource.utilizationPct = maxWeeklyCapacity > 0
        ? (resource.totalAllocatedHoursPerWeek / maxWeeklyCapacity) * 100
        : 0;
    });

    return Array.from(map.values()).sort((a, b) => b.utilizationPct - a.utilizationPct);
  }, [allocations, timesheetSummaries]);

  const filteredResources = useMemo(() => {
    return resources.filter(r => {
      const matchesSearch = !searchTerm ||
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.role.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || r.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [resources, searchTerm, roleFilter]);

  const avgUtilization = resources.length > 0
    ? resources.reduce((s, r) => s + r.utilizationPct, 0) / resources.length
    : 0;
  const overAllocated = resources.filter(r => r.utilizationPct > 100).length;
  const underUtilized = resources.filter(r => r.utilizationPct < 50 && r.utilizationPct > 0).length;
  const uniqueRoles = [...new Set(resources.map(r => r.role))].sort();

  const getUtilizationColor = (pct: number) => {
    if (pct > 100) return 'text-red-600 bg-red-50';
    if (pct >= 80) return 'text-amber-600 bg-amber-50';
    if (pct >= 50) return 'text-emerald-600 bg-emerald-50';
    if (pct > 0) return 'text-blue-600 bg-blue-50';
    return 'text-slate-400 bg-slate-50';
  };

  const getBarColor = (pct: number) => {
    if (pct > 100) return 'bg-red-500';
    if (pct >= 80) return 'bg-amber-500';
    if (pct >= 50) return 'bg-emerald-500';
    return 'bg-blue-400';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />)}
        </div>
        <div className="h-96 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Resource Utilization</h1>
        <p className="text-sm text-slate-500 mt-1">Cross-project resource allocation, capacity planning, and utilization tracking</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5" hover={false}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Team Members</p>
              <p className="text-xl font-bold text-blue-700">{resources.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5" hover={false}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50">
              <Activity className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Avg Utilization</p>
              <p className="text-xl font-bold text-emerald-700">{avgUtilization.toFixed(0)}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-5" hover={false}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-red-50">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Over-Allocated</p>
              <p className="text-xl font-bold text-red-700">{overAllocated}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5" hover={false}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Under-Utilized</p>
              <p className="text-xl font-bold text-amber-700">{underUtilized}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search team members..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
        >
          <option value="all">All Roles</option>
          {uniqueRoles.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {filteredResources.length === 0 ? (
          <Card className="p-12 text-center" hover={false}>
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No Resources Found</h3>
            <p className="text-sm text-slate-500">Resource allocations will appear here once team members are assigned to projects.</p>
          </Card>
        ) : (
          filteredResources.map(resource => {
            const isExpanded = expandedResource === resource.userId;
            return (
              <Card key={resource.userId} hover={false}>
                <div
                  className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedResource(isExpanded ? null : resource.userId)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                      {resource.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{resource.name}</span>
                        <Badge className="bg-slate-100 text-slate-600 capitalize text-[10px]">{resource.role.replace(/_/g, ' ')}</Badge>
                        {resource.utilizationPct > 100 && (
                          <Badge className="bg-red-100 text-red-700 text-[10px]">
                            <AlertTriangle className="w-3 h-3 mr-0.5" />
                            Over-allocated
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                        <span>{resource.projectCount} project{resource.projectCount !== 1 ? 's' : ''}</span>
                        <span>{resource.totalAllocatedHoursPerWeek}h/week allocated</span>
                        <span>{resource.actualHoursThisMonth.toFixed(1)}h logged this month</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="w-32">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-slate-400">Utilization</span>
                          <span className={`text-xs font-bold ${
                            resource.utilizationPct > 100 ? 'text-red-600' :
                            resource.utilizationPct >= 80 ? 'text-amber-600' :
                            resource.utilizationPct >= 50 ? 'text-emerald-600' : 'text-blue-600'
                          }`}>
                            {resource.utilizationPct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full transition-all ${getBarColor(resource.utilizationPct)}`}
                            style={{ width: `${Math.min(resource.utilizationPct, 100)}%` }}
                          />
                        </div>
                      </div>

                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-slate-400" />
                        : <ChevronDown className="w-4 h-4 text-slate-400" />
                      }
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-100 bg-slate-50">
                    <div className="mt-3">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Project Assignments</h4>
                      <div className="space-y-2">
                        {resource.allocations.map(alloc => {
                          const healthColor = alloc.job_orders?.health_status === 'red' ? 'bg-red-500' :
                            alloc.job_orders?.health_status === 'amber' ? 'bg-amber-500' : 'bg-emerald-500';

                          return (
                            <div key={alloc.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${healthColor}`} />
                                <div>
                                  <span className="text-sm font-medium text-slate-900">{alloc.job_orders?.job_order_number}</span>
                                  <span className="text-xs text-slate-500 ml-2">{alloc.role}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span className="font-medium text-slate-700">{alloc.allocated_hours_per_week}h/week</span>
                                <span>
                                  {format(parseISO(alloc.start_date), 'MMM d')} - {alloc.end_date ? format(parseISO(alloc.end_date), 'MMM d') : 'Ongoing'}
                                </span>
                                <Badge className={`text-[9px] capitalize ${
                                  alloc.job_orders?.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  alloc.job_orders?.status === 'in_production' ? 'bg-blue-100 text-blue-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {alloc.job_orders?.status?.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
                        <p className="text-xs text-slate-500">Weekly Capacity</p>
                        <p className="text-lg font-bold text-slate-900">40h</p>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
                        <p className="text-xs text-slate-500">Allocated</p>
                        <p className={`text-lg font-bold ${resource.totalAllocatedHoursPerWeek > 40 ? 'text-red-600' : 'text-blue-600'}`}>
                          {resource.totalAllocatedHoursPerWeek}h
                        </p>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
                        <p className="text-xs text-slate-500">Available</p>
                        <p className={`text-lg font-bold ${40 - resource.totalAllocatedHoursPerWeek < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {Math.max(0, 40 - resource.totalAllocatedHoursPerWeek)}h
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      <div className="flex items-center gap-6 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-emerald-500" /> 50-80% (Optimal)</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-amber-500" /> 80-100% (Near Capacity)</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-red-500" /> Over 100% (Over-allocated)</span>
        <span className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-blue-400" /> Under 50% (Under-utilized)</span>
      </div>
    </div>
  );
}
