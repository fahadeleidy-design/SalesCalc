import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, Target, Users, Calendar, DollarSign } from 'lucide-react';
import { usePendingTargets, useApproveTarget, useRejectTarget } from '../../hooks/useTargets';
import { useAuth } from '../../contexts/AuthContext';

export function TargetApprovalList() {
  const { user } = useAuth();
  const { data: pendingTargets, isLoading } = usePendingTargets();
  const approveTarget = useApproveTarget();
  const rejectTarget = useRejectTarget();

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleApprove = async (targetId: string) => {
    if (!user) return;
    if (confirm('Are you sure you want to approve this target?')) {
      await approveTarget.mutateAsync({ targetId, ceoId: user.id });
    }
  };

  const handleReject = async (targetId: string) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    await rejectTarget.mutateAsync({ targetId, reason: rejectionReason });
    setRejectingId(null);
    setRejectionReason('');
  };

  const formatPeriodType = (type: string) => {
    const map: Record<string, string> = {
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      half_yearly: 'Half-Yearly',
      yearly: 'Yearly',
    };
    return map[type] || type;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!pendingTargets || pendingTargets.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
        <p className="text-gray-600">There are no targets pending your approval at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="h-6 w-6 text-orange-600" />
          <h2 className="text-xl font-bold text-gray-900">
            Targets Pending Approval ({pendingTargets.length})
          </h2>
        </div>

        <div className="space-y-4">
          {pendingTargets.map((target) => (
            <div
              key={target.id}
              className="border border-gray-200 rounded-lg p-6 hover:border-orange-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    {target.sales_rep ? (
                      <Target className="h-5 w-5 text-orange-600" />
                    ) : (
                      <Users className="h-5 w-5 text-orange-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {target.sales_rep
                        ? `Individual Target: ${target.sales_rep.full_name}`
                        : `Team Target: ${target.manager?.full_name || 'Unknown Manager'}`}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {target.sales_rep?.email || target.manager?.email}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                  Pending Approval
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Period</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatPeriodType(target.period_type)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Duration</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(target.period_start).toLocaleDateString()} -{' '}
                      {new Date(target.period_end).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Target Amount</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(target.target_amount)}
                    </p>
                  </div>
                </div>
              </div>

              {target.notes && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Notes:</p>
                  <p className="text-sm text-gray-700">{target.notes}</p>
                </div>
              )}

              {rejectingId === target.id ? (
                <div className="mt-4 p-4 bg-red-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Rejection *
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    placeholder="Please provide a reason for rejecting this target..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleReject(target.id)}
                      disabled={rejectTarget.isPending}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {rejectTarget.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                    </button>
                    <button
                      onClick={() => {
                        setRejectingId(null);
                        setRejectionReason('');
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => handleApprove(target.id)}
                    disabled={approveTarget.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {approveTarget.isPending ? 'Approving...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => setRejectingId(target.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
