import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ModernModal } from '../ui/ModernModal';
import { ClipboardCheck, ThumbsUp, ThumbsDown, MessageSquare, Clock, DollarSign, User, FileText, Calendar } from 'lucide-react';
import { formatCurrency } from '../../lib/currencyUtils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface POApprovalRequest {
  id: string;
  purchase_order_id: string;
  requested_by: string;
  approved_by: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approval_level: number;
  amount_threshold: number | null;
  notes: string | null;
  decided_at: string | null;
  created_at: string;
  purchase_order: {
    id: string;
    po_number: string;
    supplier_name: string;
    total: number;
    po_date: string;
    required_delivery_date: string | null;
    payment_terms: string | null;
    notes: string | null;
    internal_notes: string | null;
    status: string;
    created_by: string;
  };
  requester: {
    full_name: string;
    email: string;
    role: string;
  };
  approver: {
    full_name: string;
    email: string;
  } | null;
}

interface POItem {
  id: string;
  description: string;
  quantity: number;
  unit_cost: number;
  line_total: number;
  notes: string | null;
}

type FilterStatus = 'all' | 'pending_my_approval' | 'approved_by_me';

export default function POApprovalWorkflow() {
  const [approvalRequests, setApprovalRequests] = useState<POApprovalRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<POApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedRequest, setSelectedRequest] = useState<POApprovalRequest | null>(null);
  const [poItems, setPOItems] = useState<POItem[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<POApprovalRequest[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentUser();
    loadApprovalRequests();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [approvalRequests, filterStatus, currentUserId]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setCurrentUserId(profile.id);
      }
    }
  };

  const loadApprovalRequests = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('po_approval_requests')
        .select(`
          *,
          purchase_order:purchase_orders!purchase_order_id(
            id,
            po_number,
            supplier_name,
            total,
            po_date,
            required_delivery_date,
            payment_terms,
            notes,
            internal_notes,
            status,
            created_by
          ),
          requester:profiles!requested_by(
            full_name,
            email,
            role
          ),
          approver:profiles!approved_by(
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setApprovalRequests(data || []);
    } catch (error: any) {
      console.error('Error loading approval requests:', error);
      toast.error('Failed to load approval requests');
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    if (!currentUserId) {
      setFilteredRequests(approvalRequests);
      return;
    }

    let filtered = [...approvalRequests];

    switch (filterStatus) {
      case 'pending_my_approval':
        filtered = filtered.filter(req =>
          req.status === 'pending' &&
          (req.approved_by === currentUserId || !req.approved_by)
        );
        break;
      case 'approved_by_me':
        filtered = filtered.filter(req =>
          req.approved_by === currentUserId &&
          req.status === 'approved'
        );
        break;
      default:
        break;
    }

    setFilteredRequests(filtered);
  };

  const loadPODetails = async (poId: string) => {
    try {
      const [itemsResult, historyResult] = await Promise.all([
        supabase
          .from('purchase_order_items')
          .select('*')
          .eq('purchase_order_id', poId)
          .order('sort_order'),
        supabase
          .from('po_approval_requests')
          .select(`
            *,
            approver:profiles!approved_by(full_name, role)
          `)
          .eq('purchase_order_id', poId)
          .order('approval_level')
      ]);

      if (itemsResult.error) throw itemsResult.error;
      if (historyResult.error) throw historyResult.error;

      setPOItems(itemsResult.data || []);
      setApprovalHistory(historyResult.data || []);
    } catch (error: any) {
      console.error('Error loading PO details:', error);
      toast.error('Failed to load PO details');
    }
  };

  const handleRequestClick = (request: POApprovalRequest) => {
    setSelectedRequest(request);
    setActionNotes('');
    loadPODetails(request.purchase_order_id);
  };

  const handleApprove = async () => {
    if (!selectedRequest || !currentUserId) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('po_approval_requests')
        .update({
          status: 'approved',
          approved_by: currentUserId,
          notes: actionNotes || null,
          decided_at: new Date().toISOString()
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success('Purchase order approved successfully');
      setSelectedRequest(null);
      loadApprovalRequests();
    } catch (error: any) {
      console.error('Error approving PO:', error);
      toast.error('Failed to approve purchase order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !currentUserId) return;
    if (!actionNotes.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('po_approval_requests')
        .update({
          status: 'rejected',
          approved_by: currentUserId,
          notes: actionNotes,
          decided_at: new Date().toISOString()
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success('Purchase order rejected');
      setSelectedRequest(null);
      loadApprovalRequests();
    } catch (error: any) {
      console.error('Error rejecting PO:', error);
      toast.error('Failed to reject purchase order');
    } finally {
      setActionLoading(false);
    }
  };

  const getAmountColor = (amount: number) => {
    if (amount < 5000) return 'success';
    if (amount < 20000) return 'warning';
    return 'danger';
  };

  const getApprovalLevelBadge = (level: number) => {
    const levels = [
      { level: 1, label: 'Manager', variant: 'info' as const },
      { level: 2, label: 'Director', variant: 'warning' as const },
      { level: 3, label: 'CEO', variant: 'danger' as const }
    ];

    const levelInfo = levels.find(l => l.level === level) || levels[0];
    return { label: levelInfo.label, variant: levelInfo.variant };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { variant: 'warning' as const, dot: true };
      case 'approved':
        return { variant: 'success' as const, dot: true };
      case 'rejected':
        return { variant: 'danger' as const, dot: true };
      default:
        return { variant: 'neutral' as const, dot: true };
    }
  };

  const groupByStatus = () => {
    const pending = filteredRequests.filter(r => r.status === 'pending');
    const approved = filteredRequests.filter(r => r.status === 'approved');
    const rejected = filteredRequests.filter(r => r.status === 'rejected');
    return { pending, approved, rejected };
  };

  const { pending, approved, rejected } = groupByStatus();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading approval requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-8 h-8 text-emerald-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">PO Approval Workflow</h1>
            <p className="text-sm text-slate-600">Review and approve purchase orders</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant={filterStatus === 'all' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilterStatus('all')}
        >
          All Requests ({approvalRequests.length})
        </Button>
        <Button
          variant={filterStatus === 'pending_my_approval' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilterStatus('pending_my_approval')}
        >
          Pending My Approval
        </Button>
        <Button
          variant={filterStatus === 'approved_by_me' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilterStatus('approved_by_me')}
        >
          Approved by Me
        </Button>
      </div>

      {filteredRequests.length === 0 ? (
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <ClipboardCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">No approval requests found</p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                Pending Approval ({pending.length})
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {pending.map(request => (
                  <Card
                    key={request.id}
                    interactive
                    onClick={() => handleRequestClick(request)}
                  >
                    <CardBody>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-slate-900">
                              {request.purchase_order.po_number}
                            </h3>
                            <Badge {...getStatusBadge(request.status)}>
                              {request.status.toUpperCase()}
                            </Badge>
                            <Badge {...getApprovalLevelBadge(request.approval_level)}>
                              {getApprovalLevelBadge(request.approval_level).label}
                            </Badge>
                            <Badge variant={getAmountColor(request.purchase_order.total)}>
                              {formatCurrency(request.purchase_order.total)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>Supplier: <span className="font-medium text-slate-900">{request.purchase_order.supplier_name}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>Requested by: <span className="font-medium text-slate-900">{request.requester.full_name}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>PO Date: {format(new Date(request.purchase_order.po_date), 'MMM dd, yyyy')}</span>
                            </div>
                            {request.purchase_order.required_delivery_date && (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span>Delivery: {format(new Date(request.purchase_order.required_delivery_date), 'MMM dd, yyyy')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {approved.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <ThumbsUp className="w-5 h-5 text-emerald-600" />
                Approved ({approved.length})
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {approved.map(request => (
                  <Card
                    key={request.id}
                    interactive
                    onClick={() => handleRequestClick(request)}
                  >
                    <CardBody>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-slate-900">
                              {request.purchase_order.po_number}
                            </h3>
                            <Badge {...getStatusBadge(request.status)}>
                              {request.status.toUpperCase()}
                            </Badge>
                            <Badge {...getApprovalLevelBadge(request.approval_level)}>
                              {getApprovalLevelBadge(request.approval_level).label}
                            </Badge>
                            <Badge variant={getAmountColor(request.purchase_order.total)}>
                              {formatCurrency(request.purchase_order.total)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>Supplier: <span className="font-medium text-slate-900">{request.purchase_order.supplier_name}</span></span>
                            </div>
                            {request.approver && (
                              <div className="flex items-center gap-2">
                                <ThumbsUp className="w-4 h-4 text-emerald-600" />
                                <span>Approved by: <span className="font-medium text-slate-900">{request.approver.full_name}</span></span>
                              </div>
                            )}
                            {request.decided_at && (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span>Approved: {format(new Date(request.decided_at), 'MMM dd, yyyy HH:mm')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {rejected.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <ThumbsDown className="w-5 h-5 text-red-600" />
                Rejected ({rejected.length})
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {rejected.map(request => (
                  <Card
                    key={request.id}
                    interactive
                    onClick={() => handleRequestClick(request)}
                  >
                    <CardBody>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-slate-900">
                              {request.purchase_order.po_number}
                            </h3>
                            <Badge {...getStatusBadge(request.status)}>
                              {request.status.toUpperCase()}
                            </Badge>
                            <Badge {...getApprovalLevelBadge(request.approval_level)}>
                              {getApprovalLevelBadge(request.approval_level).label}
                            </Badge>
                            <Badge variant={getAmountColor(request.purchase_order.total)}>
                              {formatCurrency(request.purchase_order.total)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>Supplier: <span className="font-medium text-slate-900">{request.purchase_order.supplier_name}</span></span>
                            </div>
                            {request.approver && (
                              <div className="flex items-center gap-2">
                                <ThumbsDown className="w-4 h-4 text-red-600" />
                                <span>Rejected by: <span className="font-medium text-slate-900">{request.approver.full_name}</span></span>
                              </div>
                            )}
                            {request.notes && (
                              <div className="col-span-2 flex items-start gap-2 mt-2 p-2 bg-red-50 rounded-lg">
                                <MessageSquare className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-red-900">{request.notes}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedRequest && (
        <ModernModal
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          title={`Purchase Order ${selectedRequest.purchase_order.po_number}`}
          size="xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm text-slate-600 mb-1">Supplier</p>
                <p className="font-medium text-slate-900">{selectedRequest.purchase_order.supplier_name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Amount</p>
                <p className="text-xl font-bold text-emerald-600">
                  {formatCurrency(selectedRequest.purchase_order.total)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Requested By</p>
                <p className="font-medium text-slate-900">{selectedRequest.requester.full_name}</p>
                <p className="text-xs text-slate-500">{selectedRequest.requester.email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">PO Date</p>
                <p className="font-medium text-slate-900">
                  {format(new Date(selectedRequest.purchase_order.po_date), 'MMM dd, yyyy')}
                </p>
              </div>
              {selectedRequest.purchase_order.payment_terms && (
                <div>
                  <p className="text-sm text-slate-600 mb-1">Payment Terms</p>
                  <p className="font-medium text-slate-900">{selectedRequest.purchase_order.payment_terms}</p>
                </div>
              )}
              {selectedRequest.purchase_order.required_delivery_date && (
                <div>
                  <p className="text-sm text-slate-600 mb-1">Required Delivery</p>
                  <p className="font-medium text-slate-900">
                    {format(new Date(selectedRequest.purchase_order.required_delivery_date), 'MMM dd, yyyy')}
                  </p>
                </div>
              )}
            </div>

            {selectedRequest.purchase_order.notes && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">PO Notes</p>
                    <p className="text-sm text-blue-800">{selectedRequest.purchase_order.notes}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-100 border-b-2 border-slate-200">
                    <tr>
                      <th className="py-2 px-3 text-left text-xs font-semibold text-slate-700">Description</th>
                      <th className="py-2 px-3 text-right text-xs font-semibold text-slate-700">Quantity</th>
                      <th className="py-2 px-3 text-right text-xs font-semibold text-slate-700">Unit Cost</th>
                      <th className="py-2 px-3 text-right text-xs font-semibold text-slate-700">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poItems.map(item => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="py-2 px-3 text-sm text-slate-900">
                          {item.description}
                          {item.notes && (
                            <p className="text-xs text-slate-500 mt-1">{item.notes}</p>
                          )}
                        </td>
                        <td className="py-2 px-3 text-sm text-right text-slate-900">{item.quantity}</td>
                        <td className="py-2 px-3 text-sm text-right text-slate-900">{formatCurrency(item.unit_cost)}</td>
                        <td className="py-2 px-3 text-sm text-right font-medium text-slate-900">{formatCurrency(item.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                    <tr>
                      <td colSpan={3} className="py-3 px-3 text-sm font-semibold text-right text-slate-700">Total</td>
                      <td className="py-3 px-3 text-lg font-bold text-right text-emerald-600">
                        {formatCurrency(selectedRequest.purchase_order.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {approvalHistory.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Approval Timeline</h3>
                <div className="space-y-3">
                  {approvalHistory.map((history, index) => (
                    <div key={history.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        history.status === 'approved' ? 'bg-emerald-100' :
                        history.status === 'rejected' ? 'bg-red-100' :
                        'bg-amber-100'
                      }`}>
                        {history.status === 'approved' ? (
                          <ThumbsUp className="w-4 h-4 text-emerald-600" />
                        ) : history.status === 'rejected' ? (
                          <ThumbsDown className="w-4 h-4 text-red-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-slate-900">
                            Level {history.approval_level} - {getApprovalLevelBadge(history.approval_level).label}
                          </p>
                          <Badge {...getStatusBadge(history.status)}>
                            {history.status.toUpperCase()}
                          </Badge>
                        </div>
                        {history.approver && (
                          <p className="text-sm text-slate-600">
                            {history.status === 'pending' ? 'Assigned to' :
                             history.status === 'approved' ? 'Approved by' : 'Rejected by'}: {history.approver.full_name}
                          </p>
                        )}
                        {history.decided_at && (
                          <p className="text-xs text-slate-500 mt-1">
                            {format(new Date(history.decided_at), 'MMM dd, yyyy HH:mm')}
                          </p>
                        )}
                        {history.notes && (
                          <div className="mt-2 p-2 bg-white rounded border border-slate-200">
                            <p className="text-sm text-slate-700">{history.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedRequest.status === 'pending' && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Approval Decision</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Comments / Notes
                    </label>
                    <textarea
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      rows={3}
                      placeholder="Add comments about your decision (required for rejection)..."
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="success"
                      onClick={handleApprove}
                      loading={actionLoading}
                      icon={<ThumbsUp className="w-4 h-4" />}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
                    >
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      onClick={handleReject}
                      loading={actionLoading}
                      icon={<ThumbsDown className="w-4 h-4" />}
                      className="flex-1"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ModernModal>
      )}
    </div>
  );
}
