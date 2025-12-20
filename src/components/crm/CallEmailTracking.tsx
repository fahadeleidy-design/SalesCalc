import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Phone, Mail, Plus, X, Clock, CheckCircle, XCircle, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

interface Call {
  id: string;
  call_type: string;
  call_purpose: string | null;
  phone_number: string;
  duration_seconds: number | null;
  outcome: string | null;
  call_result: string | null;
  notes: string | null;
  recording_url: string | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  created_at: string;
}

interface Email {
  id: string;
  subject: string;
  body: string;
  from_email: string;
  to_emails: string[];
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  open_count: number;
  click_count: number;
  created_at: string;
}

interface CallEmailTrackingProps {
  entityType: 'lead' | 'opportunity' | 'customer';
  entityId: string;
}

export default function CallEmailTracking({ entityType, entityId }: CallEmailTrackingProps) {
  const [activeTab, setActiveTab] = useState<'calls' | 'emails'>('calls');
  const [showCallModal, setShowCallModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('calls')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'calls'
              ? 'border-orange-500 text-orange-600 font-medium'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Calls
          </div>
        </button>
        <button
          onClick={() => setActiveTab('emails')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'emails'
              ? 'border-orange-500 text-orange-600 font-medium'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Emails
          </div>
        </button>
      </div>

      {activeTab === 'calls' ? (
        <CallsTab
          entityType={entityType}
          entityId={entityId}
          showModal={showCallModal}
          setShowModal={setShowCallModal}
        />
      ) : (
        <EmailsTab
          entityType={entityType}
          entityId={entityId}
          showModal={showEmailModal}
          setShowModal={setShowEmailModal}
        />
      )}
    </div>
  );
}

function CallsTab({
  entityType,
  entityId,
  showModal,
  setShowModal,
}: {
  entityType: string;
  entityId: string;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: calls, isLoading } = useQuery({
    queryKey: ['crm-calls', entityType, entityId],
    queryFn: async () => {
      const field = `${entityType}_id`;
      const { data, error } = await supabase
        .from('crm_calls')
        .select('*')
        .eq(field, entityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Call[];
    },
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getOutcomeIcon = (outcome: string | null) => {
    switch (outcome) {
      case 'answered':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'no_answer':
      case 'busy':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'voicemail':
        return <Phone className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
        >
          <Plus className="h-4 w-4" />
          Log Call
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      ) : !calls || calls.length === 0 ? (
        <div className="bg-slate-50 rounded-lg p-6 text-center">
          <Phone className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-600 mb-3">No calls logged yet</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            Log First Call
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {calls.map((call) => (
            <div
              key={call.id}
              className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getOutcomeIcon(call.outcome)}
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        call.call_type === 'outbound'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {call.call_type.toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-slate-900">{call.phone_number}</span>
                  </div>

                  {call.call_purpose && (
                    <p className="text-sm text-slate-700 mb-2">{call.call_purpose}</p>
                  )}

                  <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                    {call.outcome && (
                      <span className="capitalize">Outcome: {call.outcome.replace('_', ' ')}</span>
                    )}
                    {call.duration_seconds && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(call.duration_seconds)}
                      </span>
                    )}
                    <span>{format(new Date(call.created_at), 'MMM dd, yyyy h:mm a')}</span>
                  </div>

                  {call.notes && <p className="text-sm text-slate-600 mt-2">{call.notes}</p>}

                  {call.follow_up_required && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-orange-600">
                      <CheckCircle className="h-4 w-4" />
                      Follow-up required
                      {call.follow_up_date && ` on ${format(new Date(call.follow_up_date), 'MMM dd, yyyy')}`}
                    </div>
                  )}

                  {call.recording_url && (
                    <a
                      href={call.recording_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Play className="h-4 w-4" />
                      Play Recording
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CallLogModal
          entityType={entityType}
          entityId={entityId}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function EmailsTab({
  entityType,
  entityId,
  showModal,
  setShowModal,
}: {
  entityType: string;
  entityId: string;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
}) {
  const { data: emails, isLoading } = useQuery({
    queryKey: ['crm-emails', entityType, entityId],
    queryFn: async () => {
      const field = `${entityType}_id`;
      const { data, error } = await supabase
        .from('crm_emails')
        .select('*')
        .eq(field, entityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Email[];
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-100 text-blue-700';
      case 'delivered':
        return 'bg-green-100 text-green-700';
      case 'opened':
        return 'bg-purple-100 text-purple-700';
      case 'clicked':
        return 'bg-orange-100 text-orange-700';
      case 'bounced':
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
        >
          <Plus className="h-4 w-4" />
          Compose Email
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      ) : !emails || emails.length === 0 ? (
        <div className="bg-slate-50 rounded-lg p-6 text-center">
          <Mail className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-600 mb-3">No emails tracked yet</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            Compose Email
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {emails.map((email) => (
            <div
              key={email.id}
              className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="font-medium text-slate-900">{email.subject}</span>
                  </div>
                  <div className="text-sm text-slate-600">
                    To: {email.to_emails.join(', ')}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(email.status)}`}>
                  {email.status.toUpperCase()}
                </span>
              </div>

              <p className="text-sm text-slate-600 line-clamp-2 mb-2">{email.body}</p>

              <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                {email.sent_at && (
                  <span>Sent: {format(new Date(email.sent_at), 'MMM dd, yyyy h:mm a')}</span>
                )}
                {email.opened_at && (
                  <span className="text-purple-600">
                    Opened: {format(new Date(email.opened_at), 'MMM dd, h:mm a')} ({email.open_count}x)
                  </span>
                )}
                {email.clicked_at && (
                  <span className="text-orange-600">
                    Clicked: {format(new Date(email.clicked_at), 'MMM dd, h:mm a')} ({email.click_count}x)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <EmailComposeModal
          entityType={entityType}
          entityId={entityId}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function CallLogModal({
  entityType,
  entityId,
  onClose,
}: {
  entityType: string;
  entityId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    call_type: 'outbound',
    phone_number: '',
    call_purpose: '',
    duration_seconds: '',
    outcome: 'answered',
    call_result: '',
    notes: '',
    follow_up_required: false,
    follow_up_date: '',
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data: any = {
        ...formData,
        [`${entityType}_id`]: entityId,
        duration_seconds: formData.duration_seconds ? Number(formData.duration_seconds) : null,
        follow_up_date: formData.follow_up_date ? new Date(formData.follow_up_date).toISOString() : null,
      };

      const { error } = await supabase.from('crm_calls').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-calls'] });
      toast.success('Call logged successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to log call');
    },
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Log Call</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Call Type *</label>
              <select
                value={formData.call_type}
                onChange={(e) => setFormData({ ...formData, call_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="outbound">Outbound</option>
                <option value="inbound">Inbound</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Call Purpose</label>
            <input
              type="text"
              value={formData.call_purpose}
              onChange={(e) => setFormData({ ...formData, call_purpose: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="e.g., Follow-up call, Demonstration"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Duration (seconds)
              </label>
              <input
                type="number"
                value={formData.duration_seconds}
                onChange={(e) => setFormData({ ...formData, duration_seconds: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="e.g., 180"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Outcome</label>
              <select
                value={formData.outcome}
                onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="answered">Answered</option>
                <option value="no_answer">No Answer</option>
                <option value="voicemail">Voicemail</option>
                <option value="busy">Busy</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Call Result</label>
            <input
              type="text"
              value={formData.call_result}
              onChange={(e) => setFormData({ ...formData, call_result: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Brief summary of the call outcome"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Detailed notes about the call..."
            />
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.follow_up_required}
                onChange={(e) =>
                  setFormData({ ...formData, follow_up_required: e.target.checked })
                }
                className="w-4 h-4 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
              />
              <span className="text-sm text-slate-700">Follow-up Required</span>
            </label>
          </div>

          {formData.follow_up_required && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Follow-up Date
              </label>
              <input
                type="date"
                value={formData.follow_up_date}
                onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 p-6 border-t border-slate-200">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !formData.phone_number}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saveMutation.isPending ? 'Logging...' : 'Log Call'}
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

function EmailComposeModal({
  entityType,
  entityId,
  onClose,
}: {
  entityType: string;
  entityId: string;
  onClose: () => void;
}) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    subject: '',
    body: '',
    to_emails: '',
    from_email: profile?.email || '',
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data: any = {
        ...formData,
        to_emails: formData.to_emails.split(',').map(e => e.trim()),
        [`${entityType}_id`]: entityId,
        status: 'draft',
      };

      const { error } = await supabase.from('crm_emails').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-emails'] });
      toast.success('Email saved as draft');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save email');
    },
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Compose Email</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To *</label>
            <input
              type="text"
              value={formData.to_emails}
              onChange={(e) => setFormData({ ...formData, to_emails: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="email@example.com (comma-separated for multiple)"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Message *</label>
            <textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              rows={10}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-3 p-6 border-t border-slate-200">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={
              saveMutation.isPending || !formData.subject || !formData.body || !formData.to_emails
            }
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save as Draft'}
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
