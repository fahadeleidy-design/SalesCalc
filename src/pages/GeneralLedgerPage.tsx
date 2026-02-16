import { useState } from 'react';
import {
  Calculator,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';
import {
  useChartOfAccounts,
  useJournalEntries,
  useCreateJournalEntry,
  usePostJournalEntry,
} from '../hooks/useFinance';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ModernModal } from '../components/ui/ModernModal';

export default function GeneralLedgerPage() {
  const [activeTab, setActiveTab] = useState<'accounts' | 'journal'>('accounts');
  const [searchTerm, setSearchTerm] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>('all');
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);

  const { data: accounts, isLoading: accountsLoading } = useChartOfAccounts(
    accountTypeFilter === 'all' ? undefined : accountTypeFilter
  );
  const { data: journalEntries, isLoading: entriesLoading } = useJournalEntries();
  const createJournalEntry = useCreateJournalEntry();
  const postJournalEntry = usePostJournalEntry();

  const [journalForm, setJournalForm] = useState({
    entry_number: '',
    entry_date: new Date().toISOString().split('T')[0],
    entry_type: 'standard' as const,
    description: '',
    lines: [
      { account_id: '', description: '', debit_amount: 0, credit_amount: 0 },
      { account_id: '', description: '', debit_amount: 0, credit_amount: 0 },
    ],
  });

  const filteredAccounts = accounts?.filter(account =>
    account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.account_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const accountTypeCounts = accounts?.reduce((acc, account) => {
    acc[account.account_type] = (acc[account.account_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalBalance = accounts?.reduce((sum, account) => sum + account.current_balance, 0) || 0;

  const handleAddLine = () => {
    setJournalForm({
      ...journalForm,
      lines: [...journalForm.lines, { account_id: '', description: '', debit_amount: 0, credit_amount: 0 }],
    });
  };

  const handleRemoveLine = (index: number) => {
    if (journalForm.lines.length > 2) {
      setJournalForm({
        ...journalForm,
        lines: journalForm.lines.filter((_, i) => i !== index),
      });
    }
  };

  const handleSubmitJournal = async () => {
    try {
      await createJournalEntry.mutateAsync({
        ...journalForm,
        total_debit: journalForm.lines.reduce((sum, line) => sum + line.debit_amount, 0),
        total_credit: journalForm.lines.reduce((sum, line) => sum + line.credit_amount, 0),
        status: 'draft',
      });
      setShowJournalModal(false);
      setJournalForm({
        entry_number: '',
        entry_date: new Date().toISOString().split('T')[0],
        entry_type: 'standard',
        description: '',
        lines: [
          { account_id: '', description: '', debit_amount: 0, credit_amount: 0 },
          { account_id: '', description: '', debit_amount: 0, credit_amount: 0 },
        ],
      });
    } catch (error) {
      console.error('Failed to create journal entry:', error);
    }
  };

  const totalDebit = journalForm.lines.reduce((sum, line) => sum + line.debit_amount, 0);
  const totalCredit = journalForm.lines.reduce((sum, line) => sum + line.credit_amount, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">General Ledger</h1>
          <p className="text-gray-600 mt-1">Chart of accounts and journal entries</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowJournalModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Journal Entry
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Calculator className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Accounts</p>
              <p className="text-2xl font-bold text-gray-900">{accounts?.length || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Journal Entries</p>
              <p className="text-2xl font-bold text-gray-900">{journalEntries?.length || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Posted Entries</p>
              <p className="text-2xl font-bold text-gray-900">
                {journalEntries?.filter(e => e.status === 'posted').length || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Draft Entries</p>
              <p className="text-2xl font-bold text-gray-900">
                {journalEntries?.filter(e => e.status === 'draft').length || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`pb-4 px-2 font-medium transition-colors ${
            activeTab === 'accounts'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Chart of Accounts
        </button>
        <button
          onClick={() => setActiveTab('journal')}
          className={`pb-4 px-2 font-medium transition-colors ${
            activeTab === 'journal'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Journal Entries
        </button>
      </div>

      {activeTab === 'accounts' && (
        <>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search accounts by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={accountTypeFilter}
              onChange={(e) => setAccountTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="asset">Assets</option>
              <option value="liability">Liabilities</option>
              <option value="equity">Equity</option>
              <option value="revenue">Revenue</option>
              <option value="expense">Expenses</option>
              <option value="cost_of_sales">Cost of Sales</option>
            </select>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subtype
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {accountsLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredAccounts?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        No accounts found
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts?.map((account) => (
                      <tr key={account.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {account.account_code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {account.account_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {account.account_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {account.account_subtype}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                          {account.current_balance.toLocaleString('en-US', { style: 'currency', currency: 'SAR' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {account.is_active ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-400 mx-auto" />
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button className="text-blue-600 hover:text-blue-900">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button className="text-gray-600 hover:text-gray-900">
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {activeTab === 'journal' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entry Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Debit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credit
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entriesLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : journalEntries?.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      No journal entries found
                    </td>
                  </tr>
                ) : (
                  journalEntries?.map((entry: any) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {entry.entry_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(entry.entry_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {entry.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                          {entry.entry_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        {entry.total_debit.toLocaleString('en-US', { style: 'currency', currency: 'SAR' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        {entry.total_credit.toLocaleString('en-US', { style: 'currency', currency: 'SAR' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          entry.status === 'posted'
                            ? 'bg-green-100 text-green-800'
                            : entry.status === 'draft'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button className="text-blue-600 hover:text-blue-900">
                            <Eye className="h-4 w-4" />
                          </button>
                          {entry.status === 'draft' && (
                            <button
                              onClick={() => postJournalEntry.mutate(entry.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Post Entry"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ModernModal
        isOpen={showJournalModal}
        onClose={() => setShowJournalModal(false)}
        title="Create Journal Entry"
        maxWidth="4xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entry Number
              </label>
              <input
                type="text"
                value={journalForm.entry_number}
                onChange={(e) => setJournalForm({ ...journalForm, entry_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Auto-generated if empty"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entry Date
              </label>
              <input
                type="date"
                value={journalForm.entry_date}
                onChange={(e) => setJournalForm({ ...journalForm, entry_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Entry Type
              </label>
              <select
                value={journalForm.entry_type}
                onChange={(e) => setJournalForm({ ...journalForm, entry_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="standard">Standard</option>
                <option value="adjusting">Adjusting</option>
                <option value="closing">Closing</option>
                <option value="reversing">Reversing</option>
                <option value="opening">Opening</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={journalForm.description}
              onChange={(e) => setJournalForm({ ...journalForm, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter journal entry description"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Journal Entry Lines
              </label>
              <Button size="sm" onClick={handleAddLine}>
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </Button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {journalForm.lines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="col-span-4">
                    <select
                      value={line.account_id}
                      onChange={(e) => {
                        const newLines = [...journalForm.lines];
                        newLines[index].account_id = e.target.value;
                        setJournalForm({ ...journalForm, lines: newLines });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">Select Account</option>
                      {accounts?.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.account_code} - {account.account_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => {
                        const newLines = [...journalForm.lines];
                        newLines[index].description = e.target.value;
                        setJournalForm({ ...journalForm, lines: newLines });
                      }}
                      placeholder="Description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={line.debit_amount || ''}
                      onChange={(e) => {
                        const newLines = [...journalForm.lines];
                        newLines[index].debit_amount = parseFloat(e.target.value) || 0;
                        newLines[index].credit_amount = 0;
                        setJournalForm({ ...journalForm, lines: newLines });
                      }}
                      placeholder="Debit"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={line.credit_amount || ''}
                      onChange={(e) => {
                        const newLines = [...journalForm.lines];
                        newLines[index].credit_amount = parseFloat(e.target.value) || 0;
                        newLines[index].debit_amount = 0;
                        setJournalForm({ ...journalForm, lines: newLines });
                      }}
                      placeholder="Credit"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    {journalForm.lines.length > 2 && (
                      <button
                        onClick={() => handleRemoveLine(index)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-sm text-gray-600">Total Debit:</span>
                <span className="ml-2 text-lg font-bold text-gray-900">
                  {totalDebit.toLocaleString('en-US', { style: 'currency', currency: 'SAR' })}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Total Credit:</span>
                <span className="ml-2 text-lg font-bold text-gray-900">
                  {totalCredit.toLocaleString('en-US', { style: 'currency', currency: 'SAR' })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isBalanced ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Balanced</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-red-600">
                    Difference: {Math.abs(totalDebit - totalCredit).toLocaleString('en-US', { style: 'currency', currency: 'SAR' })}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowJournalModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitJournal}
              disabled={!isBalanced || journalForm.lines.some(l => !l.account_id)}
            >
              Create Journal Entry
            </Button>
          </div>
        </div>
      </ModernModal>
    </div>
  );
}
