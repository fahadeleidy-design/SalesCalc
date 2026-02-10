import React, { useState, useEffect } from 'react';
import { Users, Plus, X, Save, Calendar, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ResourceAllocationProps {
  jobOrderId: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  name: string;
  role: string;
  allocated_hours_per_week: number;
  start_date: string;
  end_date: string;
  utilization: number;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

export default function ResourceAllocation({ jobOrderId }: ResourceAllocationProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    user_id: '',
    role: '',
    allocated_hours_per_week: 40,
    start_date: new Date().toISOString().split('T')[0],
    end_date: ''
  });

  useEffect(() => {
    fetchTeamMembers();
    fetchAvailableUsers();
  }, [jobOrderId]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_resource_allocations')
        .select(`
          id,
          user_id,
          role,
          allocated_hours_per_week,
          start_date,
          end_date,
          profiles:user_id (
            id,
            full_name
          )
        `)
        .eq('project_id', jobOrderId);

      if (error) throw error;

      const members = data?.map(item => ({
        id: item.id,
        user_id: item.user_id,
        name: item.profiles?.full_name || 'Unknown',
        role: item.role,
        allocated_hours_per_week: item.allocated_hours_per_week,
        start_date: item.start_date,
        end_date: item.end_date,
        utilization: (item.allocated_hours_per_week / 40) * 100
      })) || [];

      setTeamMembers(members);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAddMember = async () => {
    try {
      const { error } = await supabase
        .from('project_resource_allocations')
        .insert({
          project_id: jobOrderId,
          user_id: formData.user_id,
          role: formData.role,
          allocated_hours_per_week: formData.allocated_hours_per_week,
          start_date: formData.start_date,
          end_date: formData.end_date
        });

      if (error) throw error;

      setIsModalOpen(false);
      resetForm();
      fetchTeamMembers();
    } catch (error) {
      console.error('Error adding team member:', error);
    }
  };

  const handleUpdateMember = async (memberId: string, updates: Partial<TeamMember>) => {
    try {
      const { error } = await supabase
        .from('project_resource_allocations')
        .update({
          role: updates.role,
          allocated_hours_per_week: updates.allocated_hours_per_week,
          start_date: updates.start_date,
          end_date: updates.end_date
        })
        .eq('id', memberId);

      if (error) throw error;

      setEditingMember(null);
      fetchTeamMembers();
    } catch (error) {
      console.error('Error updating team member:', error);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('project_resource_allocations')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      fetchTeamMembers();
    } catch (error) {
      console.error('Error removing team member:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      role: '',
      allocated_hours_per_week: 40,
      start_date: new Date().toISOString().split('T')[0],
      end_date: ''
    });
  };

  const getTotalCapacity = () => {
    return teamMembers.reduce((sum, member) => sum + member.allocated_hours_per_week, 0);
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization > 100) return 'bg-red-500';
    if (utilization >= 80) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const getUtilizationTextColor = (utilization: number) => {
    if (utilization > 100) return 'text-red-700';
    if (utilization >= 80) return 'text-amber-700';
    return 'text-green-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading team members...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-700" />
          <h2 className="text-xl font-semibold text-gray-900">Resource Allocation</h2>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Team Member
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Total Project Capacity</span>
          <span className="text-lg font-semibold text-gray-900">{getTotalCapacity()} hrs/week</span>
        </div>
      </div>

      {teamMembers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No team members assigned yet</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Add your first team member
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                    {member.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{member.name}</h3>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {member.role}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{member.allocated_hours_per_week} hrs/week</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{member.start_date} - {member.end_date || 'Ongoing'}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Utilization</span>
                        <span className={`font-medium ${getUtilizationTextColor(member.utilization)}`}>
                          {member.utilization.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getUtilizationColor(member.utilization)} transition-all`}
                          style={{ width: `${Math.min(member.utilization, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingMember(member)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Team Member</h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team Member
                </label>
                <select
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a user</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g., Developer, Designer, PM"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allocated Hours per Week
                </label>
                <input
                  type="number"
                  value={formData.allocated_hours_per_week}
                  onChange={(e) => setFormData({ ...formData, allocated_hours_per_week: Number(e.target.value) })}
                  min="1"
                  max="168"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={!formData.user_id || !formData.role}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}

      {editingMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Allocation</h3>
              <button
                onClick={() => setEditingMember(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <input
                  type="text"
                  value={editingMember.role}
                  onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allocated Hours per Week: {editingMember.allocated_hours_per_week} hrs
                </label>
                <input
                  type="range"
                  min="1"
                  max="168"
                  value={editingMember.allocated_hours_per_week}
                  onChange={(e) => setEditingMember({
                    ...editingMember,
                    allocated_hours_per_week: Number(e.target.value),
                    utilization: (Number(e.target.value) / 40) * 100
                  })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1 hr</span>
                  <span>168 hrs</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={editingMember.start_date}
                  onChange={(e) => setEditingMember({ ...editingMember, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={editingMember.end_date}
                  onChange={(e) => setEditingMember({ ...editingMember, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingMember(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateMember(editingMember.id, editingMember)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
