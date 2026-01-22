import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Users, Plus, X, Shield, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  access_level: string;
  can_edit: boolean;
  added_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface DealTeamsProps {
  opportunityId: string;
  opportunityName: string;
}

export default function DealTeams({ opportunityId }: Omit<DealTeamsProps, 'opportunityName'>) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ['opportunity-team', opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_opportunity_teams')
        .select(`
          *,
          profiles:user_id(full_name, email)
        `)
        .eq('opportunity_id', opportunityId)
        .is('removed_at', null)
        .order('added_at', { ascending: false });

      if (error) throw error;
      return data as TeamMember[];
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('crm_opportunity_teams')
        .update({ removed_at: new Date().toISOString() })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity-team', opportunityId] });
      toast.success('Team member removed');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove team member');
    },
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-blue-100 text-blue-700';
      case 'collaborator':
        return 'bg-green-100 text-green-700';
      case 'sales_engineer':
        return 'bg-purple-100 text-purple-700';
      case 'executive_sponsor':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-600" />
            Deal Team
          </h3>
          <p className="text-sm text-slate-600 mt-1">Collaborate with your team on this deal</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
        >
          <Plus className="h-4 w-4" />
          Add Member
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      ) : !teamMembers || teamMembers.length === 0 ? (
        <div className="bg-slate-50 rounded-lg p-6 text-center">
          <Users className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-600 mb-3">No team members yet</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            Add First Team Member
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-slate-900">
                      {member.profiles?.full_name || 'Unknown User'}
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(member.role)}`}
                    >
                      {member.role.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  {member.profiles?.email && (
                    <p className="text-sm text-slate-600 mb-2">{member.profiles.email}</p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      {member.access_level.replace('_', ' ')}
                    </span>
                    {member.can_edit && <span>Can edit</span>}
                  </div>
                </div>

                {member.role !== 'owner' && (
                  <button
                    onClick={() => {
                      if (confirm('Remove this team member from the deal?')) {
                        removeMemberMutation.mutate(member.id);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddTeamMemberModal
          opportunityId={opportunityId}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

function AddTeamMemberModal({
  opportunityId,
  onClose,
}: {
  opportunityId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState('');
  const [role, setRole] = useState('collaborator');
  const [accessLevel, setAccessLevel] = useState('read_write');

  const { data: availableUsers } = useQuery({
    queryKey: ['available-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .in('role', ['sales', 'manager', 'ceo'])
        .order('full_name');

      if (error) throw error;
      return data;
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('crm_opportunity_teams').insert({
        opportunity_id: opportunityId,
        user_id: selectedUser,
        role,
        access_level: accessLevel,
        can_edit: accessLevel !== 'read_only',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity-team', opportunityId] });
      toast.success('Team member added successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add team member');
    },
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Add Team Member</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Select User *
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            >
              <option value="">Choose a user...</option>
              {availableUsers?.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="collaborator">Collaborator</option>
              <option value="viewer">Viewer</option>
              <option value="sales_engineer">Sales Engineer</option>
              <option value="executive_sponsor">Executive Sponsor</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Access Level *
            </label>
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="read_only">Read Only</option>
              <option value="read_write">Read & Write</option>
              <option value="full_access">Full Access</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 p-6 border-t border-slate-200">
          <button
            onClick={() => addMemberMutation.mutate()}
            disabled={addMemberMutation.isPending || !selectedUser}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {addMemberMutation.isPending ? 'Adding...' : 'Add Team Member'}
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
