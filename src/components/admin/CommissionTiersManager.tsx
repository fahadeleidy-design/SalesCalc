import React, { useState } from 'react';
import { Percent, Edit2, Save, X, Plus, Trash2 } from 'lucide-react';
import {
  useCommissionTiers,
  useUpdateCommissionTier,
  useCreateCommissionTier,
  useDeleteCommissionTier,
  CommissionTier,
} from '../../hooks/useCommissionTiers';

export function CommissionTiersManager() {
  const { data: tiers, isLoading } = useCommissionTiers();
  const updateTier = useUpdateCommissionTier();
  const createTier = useCreateCommissionTier();
  const deleteTier = useDeleteCommissionTier();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<CommissionTier>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newTier, setNewTier] = useState<Omit<CommissionTier, 'id' | 'created_at' | 'updated_at'>>({
    role: 'sales',
    min_achievement: 0,
    max_achievement: 0,
    commission_rate: 0,
  });

  const handleEdit = (tier: CommissionTier) => {
    setEditingId(tier.id);
    setEditValues(tier);
  };

  const handleSave = async (id: string) => {
    await updateTier.mutateAsync({ id, updates: editValues });
    setEditingId(null);
    setEditValues({});
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this commission tier?')) {
      await deleteTier.mutateAsync(id);
    }
  };

  const handleAdd = async () => {
    await createTier.mutateAsync(newTier);
    setIsAdding(false);
    setNewTier({
      role: 'sales',
      min_achievement: 0,
      max_achievement: 0,
      commission_rate: 0,
    });
  };

  const salesTiers = tiers?.filter((t) => t.role === 'sales') || [];
  const managerTiers = tiers?.filter((t) => t.role === 'manager') || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const renderTierTable = (tierList: CommissionTier[], roleType: 'sales' | 'manager') => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Min Achievement (%)
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Max Achievement (%)
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Commission Rate (%)
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {tierList.map((tier) => (
            <tr key={tier.id} className="hover:bg-gray-50">
              {editingId === tier.id ? (
                <>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={editValues.min_achievement ?? tier.min_achievement}
                      onChange={(e) =>
                        setEditValues({ ...editValues, min_achievement: parseFloat(e.target.value) })
                      }
                      className="w-24 px-2 py-1 border border-gray-300 rounded"
                      step="0.01"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={editValues.max_achievement ?? tier.max_achievement}
                      onChange={(e) =>
                        setEditValues({ ...editValues, max_achievement: parseFloat(e.target.value) })
                      }
                      className="w-24 px-2 py-1 border border-gray-300 rounded"
                      step="0.01"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={editValues.commission_rate ?? tier.commission_rate}
                      onChange={(e) =>
                        setEditValues({ ...editValues, commission_rate: parseFloat(e.target.value) })
                      }
                      className="w-24 px-2 py-1 border border-gray-300 rounded"
                      step="0.01"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(tier.id)}
                        className="text-green-600 hover:text-green-800"
                        title="Save"
                      >
                        <Save className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handleCancel}
                        className="text-gray-600 hover:text-gray-800"
                        title="Cancel"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tier.min_achievement}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tier.max_achievement}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      {tier.commission_rate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(tier)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(tier.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Percent className="h-6 w-6 text-orange-600" />
          <h2 className="text-2xl font-bold text-gray-900">Commission Tiers Management</h2>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
        >
          <Plus className="h-5 w-5" />
          Add New Tier
        </button>
      </div>

      {/* Sales Rep Commission Tiers */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Representative Tiers</h3>
        <p className="text-sm text-gray-600 mb-4">
          Commission rates based on individual target achievement
        </p>
        {renderTierTable(salesTiers, 'sales')}
      </div>

      {/* Sales Manager Commission Tiers */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Manager Tiers</h3>
        <p className="text-sm text-gray-600 mb-4">
          Commission rates based on whole team target achievement
        </p>
        {renderTierTable(managerTiers, 'manager')}
      </div>

      {/* Add New Tier Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add New Commission Tier</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={newTier.role}
                  onChange={(e) => setNewTier({ ...newTier, role: e.target.value as 'sales' | 'manager' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="sales">Sales Representative</option>
                  <option value="manager">Sales Manager</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Achievement (%)
                </label>
                <input
                  type="number"
                  value={newTier.min_achievement}
                  onChange={(e) => setNewTier({ ...newTier, min_achievement: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Achievement (%)
                </label>
                <input
                  type="number"
                  value={newTier.max_achievement}
                  onChange={(e) => setNewTier({ ...newTier, max_achievement: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  value={newTier.commission_rate}
                  onChange={(e) => setNewTier({ ...newTier, commission_rate: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  step="0.01"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAdd}
                disabled={createTier.isPending}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {createTier.isPending ? 'Adding...' : 'Add Tier'}
              </button>
              <button
                onClick={() => setIsAdding(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
