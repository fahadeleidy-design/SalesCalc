import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import {
  X,
  Trash2,
  UserPlus,
  Tag,
  Star,
  BarChart3,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSalesTeam } from '../../hooks/useSalesTeam';

interface BulkActionsBarProps {
  selectedIds: string[];
  entityType: 'lead' | 'opportunity';
  onClear: () => void;
  onComplete: () => void;
}

export default function BulkActionsBar({
  selectedIds,
  entityType,
  onClear,
  onComplete,
}: BulkActionsBarProps) {
  const queryClient = useQueryClient();
  const { data: teamMembers } = useSalesTeam();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>('');

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ updates }: { updates: any }) => {
      const table = entityType === 'lead' ? 'crm_leads' : 'crm_opportunities';
      const { error } = await supabase
        .from(table)
        .update(updates)
        .in('id', selectedIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`crm-${entityType}s`] });
      toast.success(`Successfully updated ${selectedIds.length} ${entityType}(s)`);
      onComplete();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update records');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const table = entityType === 'lead' ? 'crm_leads' : 'crm_opportunities';
      const { error } = await supabase
        .from(table)
        .delete()
        .in('id', selectedIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`crm-${entityType}s`] });
      toast.success(`Successfully deleted ${selectedIds.length} ${entityType}(s)`);
      onComplete();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete records');
    },
  });

  const handleBulkAssign = (assignToId: string) => {
    bulkUpdateMutation.mutate({
      updates: { assigned_to: assignToId },
    });
    setShowAssignModal(false);
  };

  const handleBulkStatusChange = (status: string) => {
    const statusField = entityType === 'lead' ? 'lead_status' : 'stage';
    bulkUpdateMutation.mutate({
      updates: { [statusField]: status },
    });
    setShowStatusModal(false);
  };

  const handleMarkAsHot = () => {
    if (entityType === 'lead') {
      bulkUpdateMutation.mutate({
        updates: { is_hot_lead: true },
      });
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.length} ${entityType}(s)? This action cannot be undone.`)) {
      bulkDeleteMutation.mutate();
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4">
        <div className="bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="font-semibold">
                  {selectedIds.length} {entityType}(s) selected
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Assign */}
              {teamMembers && teamMembers.length > 0 && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm font-medium"
                >
                  <UserPlus className="h-4 w-4" />
                  Assign
                </button>
              )}

              {/* Change Status */}
              <button
                onClick={() => setShowStatusModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors text-sm font-medium"
              >
                <BarChart3 className="h-4 w-4" />
                Status
              </button>

              {/* Mark as Hot (leads only) */}
              {entityType === 'lead' && (
                <button
                  onClick={handleMarkAsHot}
                  className="flex items-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors text-sm font-medium"
                >
                  <Star className="h-4 w-4" />
                  Hot Lead
                </button>
              )}

              {/* Delete */}
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-sm font-medium"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>

              {/* Clear */}
              <button
                onClick={onClear}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Assign to Team Member</h3>
              <p className="text-sm text-slate-600 mt-1">
                Assign {selectedIds.length} {entityType}(s) to a team member
              </p>
            </div>
            <div className="p-6 space-y-2">
              {teamMembers?.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleBulkAssign(member.id)}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-50 border border-slate-200 transition-colors"
                >
                  <p className="font-medium text-slate-900">{member.full_name}</p>
                  <p className="text-sm text-slate-600">{member.email} • {member.role}</p>
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-slate-200">
              <button
                onClick={() => setShowAssignModal(false)}
                className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Change Status</h3>
              <p className="text-sm text-slate-600 mt-1">
                Update status for {selectedIds.length} {entityType}(s)
              </p>
            </div>
            <div className="p-6 space-y-2">
              {entityType === 'lead' ? (
                <>
                  {['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'lost', 'unqualified'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleBulkStatusChange(status)}
                      className="w-full text-left px-4 py-2 rounded-lg hover:bg-slate-50 border border-slate-200 capitalize"
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </>
              ) : (
                <>
                  {['prospecting', 'qualification', 'needs_analysis', 'proposal', 'negotiation', 'closed_won', 'closed_lost'].map((stage) => (
                    <button
                      key={stage}
                      onClick={() => handleBulkStatusChange(stage)}
                      className="w-full text-left px-4 py-2 rounded-lg hover:bg-slate-50 border border-slate-200 capitalize"
                    >
                      {stage.replace('_', ' ')}
                    </button>
                  ))}
                </>
              )}
            </div>
            <div className="p-4 border-t border-slate-200">
              <button
                onClick={() => setShowStatusModal(false)}
                className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
