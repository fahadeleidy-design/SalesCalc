import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Users, Plus, Edit2, Trash2, UserPlus, Crown, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Team {
  id: string;
  name: string;
  description: string;
  manager_id: string;
  supervisor_id: string | null;
  supervisor?: {
    id: string;
    full_name: string;
    email: string;
  };
  created_at: string;
  member_count?: number;
}

interface TeamMember {
  id: string;
  team_id: string;
  sales_rep_id: string;
  sales_rep: {
    id: string;
    full_name: string;
    email: string;
  };
  added_at: string;
}

interface SalesRep {
  id: string;
  full_name: string;
  email: string;
}

export default function TeamsPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  // Fetch teams
  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_teams')
        .select(`
          *,
          supervisor:profiles!sales_teams_supervisor_id_fkey(id, full_name, email)
        `)
        .eq('manager_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get member count for each team
      const teamsWithCount = await Promise.all(
        (data || []).map(async (team) => {
          const { count } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id);

          return { ...team, member_count: count || 0 };
        })
      );

      return teamsWithCount;
    },
    enabled: !!profile?.id && profile?.role === 'manager',
  });

  // Fetch available sales reps
  const { data: salesReps } = useQuery({
    queryKey: ['sales-reps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'sales')
        .order('full_name');

      if (error) throw error;
      return data as SalesRep[];
    },
  });

  if (!profile || profile.role !== 'manager') {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">Only managers can access team management.</p>
        </div>
      </div>
    );
  }

  if (teamsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-7 w-7 text-orange-600" />
            Sales Teams Management
          </h1>
          <p className="text-slate-600 mt-1">Organize your sales representatives into teams with supervisors</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Create Team
        </button>
      </div>

      {/* Teams Grid */}
      {!teams || teams.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Teams Yet</h3>
          <p className="text-slate-600 mb-4">Create your first team to organize your sales representatives.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create First Team
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onEdit={setEditingTeam}
              onViewMembers={setShowMembersModal}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Team Modal */}
      {(showCreateModal || editingTeam) && (
        <TeamModal
          team={editingTeam}
          salesReps={salesReps || []}
          onClose={() => {
            setShowCreateModal(false);
            setEditingTeam(null);
          }}
          managerId={profile.id}
        />
      )}

      {/* Team Members Modal */}
      {showMembersModal && (
        <TeamMembersModal
          teamId={showMembersModal}
          salesReps={salesReps || []}
          onClose={() => setShowMembersModal(null)}
        />
      )}
    </div>
  );
}

function TeamCard({ team, onEdit, onViewMembers }: { team: Team; onEdit: (team: Team) => void; onViewMembers: (teamId: string) => void }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase
        .from('sales_teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete team');
    },
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900">{team.name}</h3>
          {team.description && (
            <p className="text-sm text-slate-600 mt-1">{team.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(team)}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this team?')) {
                deleteMutation.mutate(team.id);
              }
            }}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {team.supervisor && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-amber-50 rounded-lg">
          <Crown className="h-4 w-4 text-amber-600" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-amber-700 font-medium">Supervisor</p>
            <p className="text-sm text-amber-900 truncate">{team.supervisor.full_name}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-slate-200">
        <div className="flex items-center gap-2 text-slate-600">
          <Users className="h-4 w-4" />
          <span className="text-sm">{team.member_count || 0} members</span>
        </div>
        <button
          onClick={() => onViewMembers(team.id)}
          className="text-sm text-orange-600 hover:text-orange-700 font-medium"
        >
          Manage Members
        </button>
      </div>
    </div>
  );
}

function TeamModal({ team, salesReps, onClose, managerId }: { team: Team | null; salesReps: SalesRep[]; onClose: () => void; managerId: string }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: team?.name || '',
    description: team?.description || '',
    supervisor_id: team?.supervisor_id || '',
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (team) {
        // Update existing team
        const { error } = await supabase
          .from('sales_teams')
          .update({
            name: formData.name,
            description: formData.description,
            supervisor_id: formData.supervisor_id || null,
          })
          .eq('id', team.id);

        if (error) throw error;
      } else {
        // Create new team
        const { error } = await supabase
          .from('sales_teams')
          .insert({
            name: formData.name,
            description: formData.description,
            supervisor_id: formData.supervisor_id || null,
            manager_id: managerId,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success(team ? 'Team updated successfully' : 'Team created successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save team');
    },
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">
            {team ? 'Edit Team' : 'Create New Team'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Team Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="e.g., North Region Team"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              rows={3}
              placeholder="Brief description of the team..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Assign Supervisor
            </label>
            <select
              value={formData.supervisor_id}
              onChange={(e) => setFormData({ ...formData, supervisor_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">No supervisor</option>
              {salesReps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.full_name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Supervisors can view and help manage their team
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!formData.name || saveMutation.isPending}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saveMutation.isPending ? 'Saving...' : team ? 'Update Team' : 'Create Team'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function TeamMembersModal({ teamId, salesReps, onClose }: { teamId: string; salesReps: SalesRep[]; onClose: () => void }) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedRepId, setSelectedRepId] = useState('');

  // Fetch team info
  const { data: team } = useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_teams')
        .select('*, supervisor:profiles!sales_teams_supervisor_id_fkey(full_name)')
        .eq('id', teamId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch team members
  const { data: members, isLoading } = useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          sales_rep:profiles!team_members_sales_rep_id_fkey(id, full_name, email)
        `)
        .eq('team_id', teamId);

      if (error) throw error;
      return data as TeamMember[];
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (salesRepId: string) => {
      const { error } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          sales_rep_id: salesRepId,
          added_by: profile?.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Member added successfully');
      setShowAddMember(false);
      setSelectedRepId('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add member');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Member removed successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove member');
    },
  });

  const availableReps = salesReps.filter(
    (rep) => !members?.some((m) => m.sales_rep_id === rep.id)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{team?.name} - Team Members</h2>
            {team?.supervisor && (
              <p className="text-sm text-slate-600 mt-1">
                Supervised by: <span className="font-medium">{team.supervisor.full_name}</span>
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : !members || members.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Members Yet</h3>
              <p className="text-slate-600 mb-4">Add sales representatives to this team.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div>
                    <p className="font-medium text-slate-900">{member.sales_rep.full_name}</p>
                    <p className="text-sm text-slate-600">{member.sales_rep.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Remove this member from the team?')) {
                        removeMemberMutation.mutate(member.id);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showAddMember ? (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Sales Representative
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedRepId}
                  onChange={(e) => setSelectedRepId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Choose a sales rep...</option>
                  {availableReps.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.full_name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => selectedRepId && addMemberMutation.mutate(selectedRepId)}
                  disabled={!selectedRepId || addMemberMutation.isPending}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddMember(false);
                    setSelectedRepId('');
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddMember(true)}
              disabled={availableReps.length === 0}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 text-slate-600 rounded-lg hover:border-orange-500 hover:text-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <UserPlus className="h-5 w-5" />
              {availableReps.length === 0 ? 'All sales reps assigned' : 'Add Team Member'}
            </button>
          )}
        </div>

        <div className="p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
