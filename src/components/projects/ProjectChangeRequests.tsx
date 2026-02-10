import React, { useState, useEffect } from 'react';
import { FileEdit, Plus, X, Check, XCircle, Clock, DollarSign, Calendar, User, MessageSquare } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface ChangeRequest {
  id: string;
  job_order_id: string;
  title: string;
  description: string;
  change_type: 'scope' | 'schedule' | 'budget';
  justification: string;
  requested_by: string;
  requested_date: string;
  reviewed_by?: string;
  reviewed_date?: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  estimated_cost_impact?: number;
  estimated_schedule_impact?: number;
  actual_cost_impact?: number;
  actual_schedule_impact?: number;
  approval_notes?: string;
}

interface ProjectChangeRequestsProps {
  jobOrderId: string;
}

type StatusFilter = 'all' | 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';

const ProjectChangeRequests: React.FC<ProjectChangeRequestsProps> = ({ jobOrderId }) => {
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    change_type: 'scope' as 'scope' | 'schedule' | 'budget',
    justification: '',
    estimated_cost_impact: '',
    estimated_schedule_impact: '',
  });

  const [approvalData, setApprovalData] = useState({
    approval_notes: '',
  });

  useEffect(() => {
    fetchChangeRequests();
  }, [jobOrderId]);

  useEffect(() => {
    filterRequests();
  }, [changeRequests, statusFilter]);

  const fetchChangeRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_change_requests')
        .select('*')
        .eq('job_order_id', jobOrderId)
        .order('requested_date', { ascending: false });

      if (error) throw error;
      setChangeRequests(data || []);
    } catch (error) {
      console.error('Error fetching change requests:', error);
      toast.error('Failed to load change requests');
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    if (statusFilter === 'all') {
      setFilteredRequests(changeRequests);
    } else {
      setFilteredRequests(changeRequests.filter(req => req.status === statusFilter));
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('You must be logged in to create a change request');
        return;
      }

      const newRequest = {
        job_order_id: jobOrderId,
        title: formData.title,
        description: formData.description,
        change_type: formData.change_type,
        justification: formData.justification,
        requested_by: user.id,
        requested_date: new Date().toISOString(),
        status: 'submitted',
        estimated_cost_impact: formData.estimated_cost_impact ? parseFloat(formData.estimated_cost_impact) : null,
        estimated_schedule_impact: formData.estimated_schedule_impact ? parseInt(formData.estimated_schedule_impact) : null,
      };

      const { error } = await supabase
        .from('project_change_requests')
        .insert([newRequest]);

      if (error) throw error;

      toast.success('Change request created successfully');
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        change_type: 'scope',
        justification: '',
        estimated_cost_impact: '',
        estimated_schedule_impact: '',
      });
      fetchChangeRequests();
    } catch (error) {
      console.error('Error creating change request:', error);
      toast.error('Failed to create change request');
    }
  };

  const handleApproveRequest = async () => {
    if (!selectedRequest) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('You must be logged in to approve requests');
        return;
      }

      const { error } = await supabase
        .from('project_change_requests')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_date: new Date().toISOString(),
          approval_notes: approvalData.approval_notes,
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success('Change request approved');
      setShowDetailPanel(false);
      setApprovalData({ approval_notes: '' });
      fetchChangeRequests();
    } catch (error) {
      console.error('Error approving change request:', error);
      toast.error('Failed to approve change request');
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('You must be logged in to reject requests');
        return;
      }

      const { error } = await supabase
        .from('project_change_requests')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_date: new Date().toISOString(),
          approval_notes: approvalData.approval_notes,
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success('Change request rejected');
      setShowDetailPanel(false);
      setApprovalData({ approval_notes: '' });
      fetchChangeRequests();
    } catch (error) {
      console.error('Error rejecting change request:', error);
      toast.error('Failed to reject change request');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      under_review: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles] || styles.draft}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getChangeTypeIcon = (type: string) => {
    switch (type) {
      case 'schedule':
        return <Calendar className="w-4 h-4" />;
      case 'budget':
        return <DollarSign className="w-4 h-4" />;
      case 'scope':
      default:
        return <FileEdit className="w-4 h-4" />;
    }
  };

  const openDetailPanel = (request: ChangeRequest) => {
    setSelectedRequest(request);
    setShowDetailPanel(true);
    setApprovalData({ approval_notes: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Change Requests</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['all', 'draft', 'submitted', 'under_review', 'approved', 'rejected'] as StatusFilter[]).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileEdit className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No change requests found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map((request) => (
            <div
              key={request.id}
              onClick={() => openDetailPanel(request)}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getChangeTypeIcon(request.change_type)}
                    <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                  </div>
                  <p className="text-gray-600 text-sm line-clamp-2">{request.description}</p>
                </div>
                <div className="ml-4">
                  {getStatusBadge(request.status)}
                </div>
              </div>

              <div className="flex gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{format(new Date(request.requested_date), 'MMM d, yyyy')}</span>
                </div>

                {request.estimated_cost_impact !== null && request.estimated_cost_impact !== undefined && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span>${request.estimated_cost_impact.toLocaleString()}</span>
                  </div>
                )}

                {request.estimated_schedule_impact !== null && request.estimated_schedule_impact !== undefined && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{request.estimated_schedule_impact} days</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                    {request.change_type.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">New Change Request</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief title for the change request"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Change Type
                </label>
                <select
                  value={formData.change_type}
                  onChange={(e) => setFormData({ ...formData, change_type: e.target.value as 'scope' | 'schedule' | 'budget' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="scope">Scope Change</option>
                  <option value="schedule">Schedule Change</option>
                  <option value="budget">Budget Change</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Detailed description of the proposed change"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Justification
                </label>
                <textarea
                  required
                  value={formData.justification}
                  onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Why is this change necessary?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Cost Impact ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.estimated_cost_impact}
                    onChange={(e) => setFormData({ ...formData, estimated_cost_impact: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Schedule Impact (days)
                  </label>
                  <input
                    type="number"
                    value={formData.estimated_schedule_impact}
                    onChange={(e) => setFormData({ ...formData, estimated_schedule_impact: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailPanel && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-50">
          <div className="bg-white w-full max-w-2xl h-full overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Change Request Details</h3>
              <button
                onClick={() => setShowDetailPanel(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  {getChangeTypeIcon(selectedRequest.change_type)}
                  <h4 className="text-2xl font-bold text-gray-900">{selectedRequest.title}</h4>
                </div>
                {getStatusBadge(selectedRequest.status)}
              </div>

              <div>
                <h5 className="text-sm font-semibold text-gray-700 mb-2">Description</h5>
                <p className="text-gray-600">{selectedRequest.description}</p>
              </div>

              <div>
                <h5 className="text-sm font-semibold text-gray-700 mb-2">Justification</h5>
                <p className="text-gray-600">{selectedRequest.justification}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-semibold text-gray-700 mb-2">Change Type</h5>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                    {selectedRequest.change_type.toUpperCase()}
                  </span>
                </div>

                <div>
                  <h5 className="text-sm font-semibold text-gray-700 mb-2">Requested Date</h5>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{format(new Date(selectedRequest.requested_date), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h5 className="text-lg font-semibold text-gray-900 mb-4">Impact Analysis</h5>

                <div className="space-y-4">
                  {selectedRequest.estimated_cost_impact !== null && selectedRequest.estimated_cost_impact !== undefined && (
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                        <DollarSign className="w-4 h-4" />
                        Estimated Cost Impact
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        ${selectedRequest.estimated_cost_impact.toLocaleString()}
                      </p>
                    </div>
                  )}

                  {selectedRequest.estimated_schedule_impact !== null && selectedRequest.estimated_schedule_impact !== undefined && (
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                        <Calendar className="w-4 h-4" />
                        Estimated Schedule Impact
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        {selectedRequest.estimated_schedule_impact} days
                      </p>
                    </div>
                  )}

                  {selectedRequest.actual_cost_impact !== null && selectedRequest.actual_cost_impact !== undefined && (
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                        <DollarSign className="w-4 h-4" />
                        Actual Cost Impact
                      </div>
                      <p className="text-2xl font-bold text-blue-600">
                        ${selectedRequest.actual_cost_impact.toLocaleString()}
                      </p>
                    </div>
                  )}

                  {selectedRequest.actual_schedule_impact !== null && selectedRequest.actual_schedule_impact !== undefined && (
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                        <Calendar className="w-4 h-4" />
                        Actual Schedule Impact
                      </div>
                      <p className="text-2xl font-bold text-blue-600">
                        {selectedRequest.actual_schedule_impact} days
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {selectedRequest.reviewed_by && (
                <div className="border-t border-gray-200 pt-6">
                  <h5 className="text-lg font-semibold text-gray-900 mb-4">Review Information</h5>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                        <User className="w-4 h-4" />
                        Reviewed By
                      </div>
                      <p className="text-gray-900">{selectedRequest.reviewed_by}</p>
                    </div>

                    {selectedRequest.reviewed_date && (
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                          <Clock className="w-4 h-4" />
                          Reviewed Date
                        </div>
                        <p className="text-gray-900">
                          {format(new Date(selectedRequest.reviewed_date), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    )}

                    {selectedRequest.approval_notes && (
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                          <MessageSquare className="w-4 h-4" />
                          Notes
                        </div>
                        <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                          {selectedRequest.approval_notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(selectedRequest.status === 'submitted' || selectedRequest.status === 'under_review') && (
                <div className="border-t border-gray-200 pt-6">
                  <h5 className="text-lg font-semibold text-gray-900 mb-4">Approval Actions</h5>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Approval Notes
                      </label>
                      <textarea
                        value={approvalData.approval_notes}
                        onChange={(e) => setApprovalData({ approval_notes: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Add notes about your decision..."
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleApproveRequest}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        <Check className="w-5 h-5" />
                        Approve
                      </button>
                      <button
                        onClick={handleRejectRequest}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        <XCircle className="w-5 h-5" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectChangeRequests;
