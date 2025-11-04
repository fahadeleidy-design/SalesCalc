import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, Clock, TrendingUp, Users, DollarSign, ArrowRight } from 'lucide-react';
import { useNavigation } from '../contexts/NavigationContext';

interface TeamMember {
  id: string;
  full_name: string;
  quotation_count: number;
  total_value: number;
  won_deals: number;
}

export default function ManagerDashboard() {
  const { navigate } = useNavigation();
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedToday, setApprovedToday] = useState(0);
  const [teamPipeline, setTeamPipeline] = useState(0);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pendingResult, approvedResult, pipelineResult, salesRepsResult] = await Promise.all([
      supabase
        .from('quotations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_manager'),

      supabase
        .from('quotation_approvals')
        .select('*', { count: 'exact', head: true })
        .eq('approver_role', 'manager')
        .eq('action', 'approved')
        .gte('created_at', today.toISOString()),

      supabase
        .from('quotations')
        .select('total')
        .in('status', ['pending_manager', 'pending_ceo', 'approved', 'pending_finance', 'finance_approved']),

      supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'sales')
    ]);

    setPendingCount(pendingResult.count || 0);
    setApprovedToday(approvedResult.count || 0);

    const pipeline = pipelineResult.data?.reduce((sum, q) => sum + Number(q.total), 0) || 0;
    setTeamPipeline(pipeline);

    if (salesRepsResult.data) {
      const teamData = await Promise.all(
        salesRepsResult.data.map(async (rep) => {
          const [quotationsResult, wonResult] = await Promise.all([
            supabase
              .from('quotations')
              .select('total')
              .eq('sales_rep_id', rep.id),

            supabase
              .from('quotations')
              .select('total')
              .eq('sales_rep_id', rep.id)
              .eq('status', 'deal_won')
          ]);

          return {
            id: rep.id,
            full_name: rep.full_name,
            quotation_count: quotationsResult.data?.length || 0,
            total_value: wonResult.data?.reduce((sum, q) => sum + Number(q.total), 0) || 0,
            won_deals: wonResult.data?.length || 0,
          };
        })
      );

      setTeamMembers(teamData);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Manager Dashboard</h1>
        <p className="text-slate-600 mt-1">Team performance and approval oversight</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-amber-50 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{pendingCount}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Pending Approvals</h3>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{approvedToday}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Approved Today</h3>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-coral-50 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-coral-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">
              ${teamPipeline.toLocaleString()}
            </span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Team Pipeline</h3>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-teal-50 p-3 rounded-lg">
              <Users className="w-6 h-6 text-teal-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900">{teamMembers.length}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-600">Active Sales Reps</h3>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-amber-600" />
              <div>
                <h3 className="font-semibold text-amber-900">Action Required</h3>
                <p className="text-sm text-amber-700 mt-1">
                  You have {pendingCount} quotation{pendingCount !== 1 ? 's' : ''} waiting for your approval
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/approvals')}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Review Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Team Performance</h3>
        </div>
        <div className="divide-y divide-slate-200">
          {teamMembers.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No sales team members found</p>
            </div>
          ) : (
            teamMembers.map((member) => (
              <div key={member.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900">{member.full_name}</h4>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                      <span>{member.quotation_count} quotations</span>
                      <span>•</span>
                      <span>{member.won_deals} deals won</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-slate-600">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-semibold text-slate-900">
                        {member.total_value.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Total Revenue</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
