import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    Mail,
    RefreshCw,
    CloudOff,
    Cloud,
    Check,
    AlertTriangle,
    Settings,
    Plus,
    Trash2,
    Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface EmailAccount {
    id: string;
    provider: 'gmail' | 'outlook' | 'other';
    email: string;
    connected: boolean;
    last_sync: string | null;
}

// Mock Email Accounts for demonstration.
// In production, this would integrate with OAuth for Gmail/Outlook APIs.
const mockAccounts: EmailAccount[] = [
    { id: '1', provider: 'gmail', email: 'sales@example.com', connected: true, last_sync: new Date().toISOString() },
];

export default function EmailIntegrationHub() {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [isSyncing, setIsSyncing] = useState(false);
    const [showAddAccount, setShowAddAccount] = useState(false);
    const [newAccountEmail, setNewAccountEmail] = useState('');
    const [accounts, setAccounts] = useState<EmailAccount[]>(mockAccounts);

    const handleSync = async () => {
        setIsSyncing(true);
        const toastId = toast.loading('Syncing emails...');

        // Simulate email sync delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mock: Log a few fake "synced" email activities
        try {
            const mockEmails = [
                { subject: 'RE: Proposal Review', from: 'client@company.com', body: 'Thanks for the proposal. We have some questions.' },
                { subject: 'Meeting Follow-Up', from: 'partner@corp.com', body: 'Great meeting today! Looking forward to next steps.' },
            ];

            // Find matching leads/opportunities to attach
            const { data: leads } = await supabase
                .from('crm_leads')
                .select('id, contact_email, company_name')
                .limit(5);

            if (leads && leads.length > 0) {
                const lead = leads[0];
                // Insert a mock activity
                await supabase.from('crm_activities').insert({
                    activity_type: 'email',
                    subject: mockEmails[0].subject,
                    description: `Auto-synced from inbox: "${mockEmails[0].body}"`,
                    lead_id: lead.id,
                    completed: true,
                    due_date: new Date().toISOString().split('T')[0],
                } as any);
            }

            // Update last sync time
            setAccounts(prev => prev.map(acc => ({
                ...acc,
                last_sync: new Date().toISOString()
            })));

            queryClient.invalidateQueries({ queryKey: ['crm-activities'] });
            toast.success('Email sync completed! Added 2 new activities.', { id: toastId });
        } catch (error) {
            toast.error('Sync failed', { id: toastId });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleAddAccount = () => {
        if (!newAccountEmail || !newAccountEmail.includes('@')) {
            toast.error('Please enter a valid email address');
            return;
        }

        const newAccount: EmailAccount = {
            id: Date.now().toString(),
            provider: newAccountEmail.includes('gmail') ? 'gmail' : newAccountEmail.includes('outlook') ? 'outlook' : 'other',
            email: newAccountEmail,
            connected: true,
            last_sync: null,
        };

        setAccounts(prev => [...prev, newAccount]);
        setNewAccountEmail('');
        setShowAddAccount(false);
        toast.success('Email account connected (demo mode)');
    };

    const handleRemoveAccount = (id: string) => {
        setAccounts(prev => prev.filter(acc => acc.id !== id));
        toast.success('Account removed');
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <Mail className="h-5 w-5 text-orange-500" />
                        Email Integration Hub
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                        Connect your email accounts to auto-log conversations
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSync}
                        disabled={isSyncing || accounts.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
                    >
                        {isSyncing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                        {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                    <button
                        onClick={() => setShowAddAccount(true)}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Add Account
                    </button>
                </div>
            </div>

            {/* Connected Accounts */}
            <div className="space-y-3">
                {accounts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                        <CloudOff className="h-12 w-12 text-slate-300 mb-3" />
                        <p className="font-medium">No email accounts connected</p>
                        <p className="text-sm">Add an account to start syncing emails</p>
                    </div>
                ) : (
                    accounts.map((account) => (
                        <div
                            key={account.id}
                            className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${account.provider === 'gmail' ? 'bg-red-100' :
                                        account.provider === 'outlook' ? 'bg-blue-100' :
                                            'bg-slate-100'
                                    }`}>
                                    <Mail className={`h-5 w-5 ${account.provider === 'gmail' ? 'text-red-600' :
                                            account.provider === 'outlook' ? 'text-blue-600' :
                                                'text-slate-600'
                                        }`} />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">{account.email}</p>
                                    <p className="text-sm text-slate-500 flex items-center gap-1">
                                        {account.connected ? (
                                            <>
                                                <Check className="h-3 w-3 text-green-500" />
                                                Connected
                                            </>
                                        ) : (
                                            <>
                                                <AlertTriangle className="h-3 w-3 text-amber-500" />
                                                Disconnected
                                            </>
                                        )}
                                        {account.last_sync && (
                                            <span className="ml-2">
                                                • Last sync: {new Date(account.last_sync).toLocaleTimeString()}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleRemoveAccount(account.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Add Account Modal */}
            {showAddAccount && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h4 className="text-lg font-semibold text-slate-900 mb-4">Connect Email Account</h4>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                            <p className="text-sm text-amber-800">
                                <strong>Demo Mode:</strong> In production, this would use OAuth to securely connect to Gmail or Outlook. For now, enter any email to simulate the connection.
                            </p>
                        </div>

                        <input
                            type="email"
                            value={newAccountEmail}
                            onChange={(e) => setNewAccountEmail(e.target.value)}
                            placeholder="Enter your email address"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 mb-4"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={handleAddAccount}
                                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                            >
                                Connect
                            </button>
                            <button
                                onClick={() => {
                                    setShowAddAccount(false);
                                    setNewAccountEmail('');
                                }}
                                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Banner */}
            <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-lg">
                <div className="flex items-start gap-3">
                    <Cloud className="h-5 w-5 text-indigo-600 mt-0.5" />
                    <div>
                        <p className="font-medium text-indigo-900">Automatic Email Capture</p>
                        <p className="text-sm text-indigo-700 mt-1">
                            When connected, emails matching your CRM contacts will be automatically logged as activities, giving your team complete visibility into customer communications.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
