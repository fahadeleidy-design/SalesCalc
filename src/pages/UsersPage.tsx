import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Shield, Mail, X, Save, Key } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database, UserRole } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

const roleColors: Record<UserRole, string> = {
  sales: 'bg-orange-100 text-orange-600',
  engineering: 'bg-teal-100 text-teal-700',
  manager: 'bg-purple-100 text-purple-700',
  ceo: 'bg-red-100 text-red-700',
  finance: 'bg-green-100 text-green-700',
  admin: 'bg-slate-100 text-slate-700',
};

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'sales' as UserRole,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading users:', error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const handleEdit = (user: Profile) => {
    setEditingUser(user);
    setFormData({
      email: user.email || '',
      password: '',
      full_name: user.full_name || '',
      role: user.role || 'sales',
    });
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      full_name: '',
      role: 'sales',
    });
    setShowModal(true);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);

      if (error) throw error;

      alert('User deleted successfully!');
      loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user: ' + error.message);
    }
  };

  const handleResetPassword = (user: Profile) => {
    setResetPasswordUser(user);
    setNewPassword('');
    setShowPasswordResetModal(true);
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetPasswordUser || !newPassword) {
      alert('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('admin_reset_user_password', {
        target_user_id: resetPasswordUser.user_id,
        new_password: newPassword,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data && !data.success) {
        throw new Error(data.error || 'Failed to reset password');
      }

      alert('Password reset successfully!');
      setShowPasswordResetModal(false);
      setResetPasswordUser(null);
      setNewPassword('');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      alert('Failed to reset password: ' + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.full_name) {
      alert('Please fill in all required fields');
      return;
    }

    if (!editingUser && !formData.password) {
      alert('Password is required for new users');
      return;
    }

    try {
      if (editingUser) {
        const { error } = await supabase
          .from('profiles')
      // @ts-expect-error - Supabase type inference issue
          .update({
            email: formData.email,
            full_name: formData.full_name,
            role: formData.role,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingUser.id);

        if (error) throw error;
        alert('User updated successfully!');
      } else {
        // Step 1: Create the user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.full_name,
            },
            emailRedirectTo: undefined, // Disable email confirmation
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Failed to create user');

        // Step 2: Create the profile with the specified role
        const { error: profileError } = await supabase.rpc('create_profile_for_user', {
          p_user_id: authData.user.id,
          p_email: formData.email,
          p_full_name: formData.full_name,
          p_role: formData.role,
        } as any);

        if (profileError) {
          // If profile creation fails, try to delete the auth user
          console.error('Profile creation failed:', profileError);
          throw new Error(`Failed to create user profile: ${profileError.message}`);
        }

        alert('User created successfully! They can now login with their email and password.');
      }

      setShowModal(false);
      setEditingUser(null);
      setFormData({ email: '', password: '', full_name: '', role: 'sales' });
      loadUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      alert('Failed to save user: ' + error.message);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const userCountByRole = users.reduce(
    (acc, user) => {
      acc[user.role || 'sales'] = (acc[user.role || 'sales'] || 0) + 1;
      return acc;
    },
    {} as Record<UserRole, number>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-600 mt-1">Manage system users and roles</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add User
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {(['sales', 'engineering', 'manager', 'ceo', 'finance', 'admin'] as UserRole[]).map(
          (role) => (
            <div key={role} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <Shield className="w-5 h-5 text-slate-400" />
                <span className="text-2xl font-bold text-slate-900">
                  {userCountByRole[role] || 0}
                </span>
              </div>
              <h3 className="text-xs font-medium text-slate-600 capitalize">{role}</h3>
            </div>
          )
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or role..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Email</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">Role</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                  Created
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-orange-100 w-10 h-10 rounded-full flex items-center justify-center">
                        <span className="text-orange-600 font-semibold text-sm">
                          {user.full_name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-slate-900">{user.full_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-4 h-4" />
                      {user.email}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${
                        roleColors[user.role || 'sales']
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-1 text-orange-500 hover:bg-orange-50 rounded"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleResetPassword(user)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Reset Password"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                {editingUser ? 'Edit User' : 'Add User'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingUser(null);
                  setFormData({ email: '', password: '', full_name: '', role: 'sales' });
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                  disabled={!!editingUser}
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required={!editingUser}
                    minLength={6}
                    placeholder="Minimum 6 characters"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                >
                  <option value="sales">Sales</option>
                  <option value="engineering">Engineering</option>
                  <option value="presales">Pre-Sales</option>
                  <option value="manager">Manager</option>
                  <option value="ceo">CEO</option>
                  <option value="finance">Finance</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingUser(null);
                    setFormData({ email: '', password: '', full_name: '', role: 'sales' });
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordResetModal && resetPasswordUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                Reset Password
              </h2>
              <button
                onClick={() => {
                  setShowPasswordResetModal(false);
                  setResetPasswordUser(null);
                  setNewPassword('');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handlePasswordResetSubmit} className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  Resetting password for: <strong>{resetPasswordUser.full_name}</strong>
                </p>
                <p className="text-xs text-blue-600 mt-1">{resetPasswordUser.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-1">
                  The user will be able to login with this new password immediately.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  Reset Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordResetModal(false);
                    setResetPasswordUser(null);
                    setNewPassword('');
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
